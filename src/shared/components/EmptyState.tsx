import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export default function EmptyState({ title, description, action, icon }: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-950">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {icon || <span className="text-2xl">⚠️</span>}
      </div>
      <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
