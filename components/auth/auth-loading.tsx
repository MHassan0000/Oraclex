import { Skeleton } from "@/components/ui/skeleton";

export function AuthLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}
