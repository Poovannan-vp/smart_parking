import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "teal";

type ButtonProps<T extends ElementType = "button"> = {
  as?: T;
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "className" | "children">;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-temenos-navy text-white shadow-sm shadow-temenos-navy/15 hover:bg-temenos-navy-dark focus:ring-2 focus:ring-temenos-teal focus:ring-offset-2",

  secondary:
    "bg-white text-slate-800 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 focus:ring-2 focus:ring-temenos-teal focus:ring-offset-2",

  teal:
    "bg-temenos-teal text-white shadow-sm shadow-temenos-teal/20 hover:bg-temenos-teal-dark focus:ring-2 focus:ring-temenos-teal focus:ring-offset-2",

  danger:
    "bg-rose-600 text-white shadow-sm shadow-rose-600/20 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2",

  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
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
        rounded-xl
        px-5
        py-2.5
        text-sm
        font-semibold
        transition-all
        duration-150
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:active:scale-100
        ${fullWidth ? "w-full" : ""}
        ${variantClasses[variant]}
        ${className}
      `.trim()}
    >
      {children}
    </Component>
  );
}