interface LogoProps {
  className?: string;
  hideText?: boolean;
}

export default function Logo({ className = "", hideText = false }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img src="/images/logo.svg" alt="Temenos logo" className="h-9 w-auto object-contain" />
      {!hideText ? (
        <div className="flex flex-col leading-none">
          <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#00A3E0]">TEMENOS</span>
          <span className="text-sm font-bold text-[#0F2042]">Smart Parking</span>
        </div>
      ) : null}
    </div>
  );
}

