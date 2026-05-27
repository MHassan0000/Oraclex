"use client";

import { Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAuthRedirectPath } from "@/hooks/use-auth-redirect";

export function AuthSocial() {
  const { signInWithProvider, loading } = useAuth();
  const redirectPath = useAuthRedirectPath();

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button
        variant="outline"
        type="button"
        disabled={loading}
        onClick={() => signInWithProvider("google", redirectPath)}
      >
        <span className="sr-only">Continue with Google</span>
        Google
      </Button>
      <Button
        variant="outline"
        type="button"
        disabled={loading}
        onClick={() => signInWithProvider("github", redirectPath)}
      >
        <span className="sr-only">Continue with GitHub</span>
        <Github className="mr-2 h-4 w-4" />
        GitHub
      </Button>
    </div>
  );
}
