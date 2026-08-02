import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  flat?: boolean;
}

export default function Card({
  children,
  className = "",
  flat = false,
}: CardProps) {
  return (
    <div
      className={`
        rounded-[1.75rem]
        bg-white
        p-6
        sm:p-8
        border
        border-slate-200
        ${flat ? "" : "shadow-sm shadow-slate-200/60"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}