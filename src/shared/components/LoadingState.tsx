import type { ReactNode } from "react";

interface Props {
  message?: string;
  inline?: boolean;
  children?: ReactNode;
}

export default function LoadingState({ message = "Loading...", inline = false, children }: Props) {
  const baseClass = inline ? "inline-flex items-center gap-3 text-sm text-slate-600" : "rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-950";

  return (
    <div className={baseClass} role="status" aria-live="polite">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
        </svg>
      </div>
      <div className={inline ? "" : "mt-4 text-sm text-slate-500 dark:text-slate-400"}>
        <p>{message}</p>
        {children ? <div className="mt-2">{children}</div> : null}
      </div>
    </div>
  );
}
