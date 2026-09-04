import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  variant?: "error" | "success" | "warning" | "info";
  className?: string;
}

const styles: Record<NonNullable<Props["variant"]>, string> = {
  error: "border-rose-200 bg-rose-50 text-rose-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-temenos-navy",
};

export default function Alert({ children, variant = "info", className = "" }: Props) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-2xl border p-4 text-sm font-medium ${styles[variant]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
