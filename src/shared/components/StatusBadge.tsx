import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const styles: Record<NonNullable<Props["variant"]>, string> = {
  default: "bg-slate-100 text-slate-700 border border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-rose-50 text-rose-700 border border-rose-200",
  info: "bg-sky-50 text-[#0F2042] border border-sky-200",
};

export default function StatusBadge({ children, variant = "default", className = "" }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[variant]} ${className}`.trim()}>
      {children}
    </span>
  );
}

