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
    <div className="w-full space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>

      <input
        id={inputId}
        {...props}
        className={`
          h-12
          w-full
          rounded-2xl
          border
          border-slate-300
          bg-white
          px-4
          text-sm
          text-slate-900
          outline-none
          transition
          duration-200
          focus:border-sky-900
          focus:ring-2
          focus:ring-sky-200
          disabled:bg-slate-100
          ${className}
        `}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
      />

      <div className="space-y-1">
        {helpText ? <p id={`${inputId}-help`} className="text-xs text-slate-500">{helpText}</p> : null}
        {error ? <p id={`${inputId}-error`} className="text-xs text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}