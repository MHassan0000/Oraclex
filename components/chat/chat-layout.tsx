import type { WithChildren } from "@/lib/types";

export function ChatLayout({ children }: WithChildren) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
