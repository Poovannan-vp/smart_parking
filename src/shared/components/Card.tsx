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
        rounded-2xl
        bg-white
        p-6
        sm:p-7
        border
        border-slate-200/80
        ${flat ? "" : "shadow-sm shadow-slate-200/50"}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}