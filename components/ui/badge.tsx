// components/ui/badge.tsx
import type { ReactNode, HTMLAttributes } from "react";

type BadgeVariant = "solid" | "outline" | "soft";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
} & HTMLAttributes<HTMLSpanElement>;

export function Badge({
  children,
  variant = "solid",
  className = "",
  ...props
}: BadgeProps) {
  let base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ";

  if (variant === "solid") {
    base +=
      "bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900";
  } else if (variant === "outline") {
    base +=
      "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200";
  } else {
    // soft
    base +=
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  }

  const classes = base + (className ? ` ${className}` : "");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
