"use client";

import Link from "next/link";

import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function AuthNav() {
  const { user, signOut, loading, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-40 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Get started</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-xs text-muted-foreground">
        <div className="text-sm font-medium text-foreground">{user.email}</div>
        <Link className="text-[0.7rem] text-muted-foreground hover:underline" href="/profile">
          Manage profile
        </Link>
      </div>
      <Button variant="outline" size="sm" onClick={signOut} disabled={loading}>
        Logout
      </Button>
    </div>
  );
}
