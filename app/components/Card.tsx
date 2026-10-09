import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}

export default function Card({
  children,
  className = "",
  interactive = false,
  ...rest
}: CardProps) {
  const base =
    "rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-sm";
  const hover = interactive
    ? " transition-shadow hover:shadow-xl"
    : "";
  return (
    <div className={`${base}${hover} ${className}`} {...rest}>
      {children}
    </div>
  );
}
