import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={id}
        {...props}
        className={`
          h-12
          w-full
          rounded-xl
          border
          border-slate-300
          bg-white
          px-4
          text-sm
          outline-none
          transition
          focus:border-blue-600
          focus:ring-2
          focus:ring-blue-200
          disabled:bg-slate-100
          ${className}
        `}
      />

      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}