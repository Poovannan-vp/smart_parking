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
        rounded-3xl
        bg-white
        p-6
        ${flat ? "border border-slate-200" : "shadow-sm border border-slate-200"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}