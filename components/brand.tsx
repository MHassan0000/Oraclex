import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandProps = {
  name: string;
  label?: string;
  className?: string;
};

export function Brand({ name, label, className }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-950 dark:bg-foreground/10">
        <Image
          src="/images/oraclex-logo.png"
          alt={name}
          width={28}
          height={28}
          className="rounded-lg"
        />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-foreground">{name}</p>
        {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
      </div>
    </div>
  );
}
