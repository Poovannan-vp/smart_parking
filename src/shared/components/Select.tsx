import type { ReactNode, SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helpText?: string;
  children: ReactNode;
}

export default function Select({
  label,
  helpText,
  className = "",
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full space-y-1.5">
      <label htmlFor={selectId} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>

      <select
        id={selectId}
        {...props}
        className={`
          h-11
          w-full
          rounded-xl
          border
          border-slate-300
          bg-white
          px-4
          text-sm
          text-slate-900
          outline-none
          transition-all
          duration-150
          focus:border-temenos-teal
          focus:ring-2
          focus:ring-temenos-teal/20
          disabled:cursor-not-allowed
          disabled:bg-slate-100
          disabled:text-slate-500
          ${className}
        `.trim()}
      >
        {children}
      </select>

      {helpText ? <p className="text-xs text-slate-500">{helpText}</p> : null}
    </div>
  );
}
