import { OraclexMark } from "@/components/icons/oraclex-mark";
import { cn } from "@/lib/utils";

type BrandProps = {
  name: string;
  label?: string;
  className?: string;
};

export function Brand({ name, label, className }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/10">
        <OraclexMark className="h-6 w-6" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        {label ? (
          <p className="text-xs text-muted-foreground">{label}</p>
        ) : null}
      </div>
    </div>
  );
}
