import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps<T extends ElementType = "button"> = {
  as?: T;
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "className" | "children">;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-950 text-white shadow-sm shadow-sky-950/10 hover:bg-sky-900 focus:ring-sky-500",

  secondary:
    "bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50 focus:ring-sky-500",

  danger:
    "bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700 focus:ring-rose-500",

  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400",
};

export default function Button<T extends ElementType = "button">({
  as,
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps<T>) {
  const Component = as || "button";

  return (
    <Component
      {...props}
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
    </Component>
  );
}