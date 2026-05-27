import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The path you are looking for does not exist in this workspace.
      </p>
      <Button asChild>
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
