import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helpText?: string;
}

export default function Input({
  label,
  error,
  helpText,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>

      <input
        id={inputId}
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
          placeholder:text-slate-400
          outline-none
          transition-all
          duration-150
          focus:border-[#00A3E0]
          focus:ring-2
          focus:ring-[#00A3E0]/20
          disabled:bg-slate-100
          disabled:text-slate-500
          ${error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20" : ""}
          ${className}
        `.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
      />

      {helpText || error ? (
        <div className="space-y-1">
          {helpText && !error ? <p id={`${inputId}-help`} className="text-xs text-slate-500">{helpText}</p> : null}
          {error ? <p id={`${inputId}-error`} className="text-xs font-medium text-rose-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}