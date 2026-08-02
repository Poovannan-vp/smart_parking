interface LogoProps {
  className?: string;
  hideText?: boolean;
}

export default function Logo({ className = "", hideText = false }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img src="/images/logo.svg" alt="Temenos logo" className="h-10 w-auto" />
      {!hideText ? (
        <div className="grid gap-0 leading-tight">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Temenos</span>
          <span className="text-sm font-semibold text-slate-900">Smart Parking</span>
        </div>
      ) : null}
    </div>
  );
}
