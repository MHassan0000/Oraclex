import * as React from "react";

import { cn } from "@/lib/utils";

type AuthInputProps = React.ComponentProps<"input"> & {
  label: string;
  hint?: string;
  error?: string;
};

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-2 text-left">
        <label htmlFor={inputId} className="text-xs font-semibold text-foreground">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            "flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm",
            "transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-60",
            error && "border-destructive/70 focus-visible:ring-destructive/40",
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-destructive">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

AuthInput.displayName = "AuthInput";
