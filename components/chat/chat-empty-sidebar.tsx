import { MessageSquare } from "lucide-react";

export function ChatEmptySidebar() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 text-center text-sm text-muted-foreground">
      <MessageSquare className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-2">No conversations yet.</p>
      <p className="text-xs text-muted-foreground">Start a new chat to see history here.</p>
    </div>
  );
}
