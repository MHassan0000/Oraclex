import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { clientEnv } from "@/lib/env/client";
import { getSafeRedirectPath } from "@/lib/auth/redirects";
import { AUTH_REDIRECT_PARAM } from "@/lib/auth/constants";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = getSafeRedirectPath(url.searchParams.get(AUTH_REDIRECT_PARAM), "/");

  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(redirectTo, url.origin));
  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  return response;
}
