import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-900 text-white shadow-sm shadow-slate-900/10 hover:bg-slate-800 focus:ring-slate-900",

  secondary:
    "bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50 focus:ring-slate-500",

  danger:
    "bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700 focus:ring-rose-500",

  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400",
};

export default function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`
        inline-flex
        items-center
        justify-center
        rounded-2xl
        px-5
        py-3
        text-sm
        font-semibold
        transition
        duration-200
        focus:outline-none
        focus:ring-2
        focus:ring-offset-2
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${fullWidth ? "w-full" : ""}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}