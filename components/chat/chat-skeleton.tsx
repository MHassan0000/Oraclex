import { Skeleton } from "@/components/ui/skeleton";

export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={`chat-skeleton-${index}`} className="rounded-3xl border border-border/60 p-5">
          <div className="flex gap-4">
            <Skeleton className="h-9 w-9 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
