import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({
  children,
  className = "",
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl
        bg-white
        p-5
        shadow-sm
        border
        border-slate-200
        ${className}
      `}
    >
      {children}
    </div>
  );
}