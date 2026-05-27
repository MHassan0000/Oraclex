import * as React from "react";

import { cn } from "@/lib/utils";

type OraclexMarkProps = React.SVGProps<SVGSVGElement>;

export function OraclexMark({ className, ...props }: OraclexMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("h-6 w-6", className)}
      {...props}
    >
      <rect
        x="6"
        y="6"
        width="36"
        height="36"
        rx="12"
        className="fill-foreground/10"
      />
      <path
        d="M14 26.5C14 20.7 18.7 16 24.5 16H34v3.6h-9.2c-3.9 0-7.1 3.2-7.1 7.1 0 3.9 3.2 7.1 7.1 7.1H34V37h-9.5C18.7 37 14 32.3 14 26.5Z"
        className="fill-foreground"
      />
      <circle cx="22.5" cy="26.5" r="4.3" className="fill-foreground" />
    </svg>
  );
}
