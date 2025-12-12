// components/ui/card.tsx
import type { ReactNode, HTMLAttributes } from "react";

type CardProps = {
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function Card({ children, className = "", ...props }: CardProps) {
  const classes =
    "rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 " +
    className;

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
