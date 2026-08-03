import { HiBars3 } from "react-icons/hi2";
import Button from "./Button";
import Logo from "./Logo";
import StatusBadge from "./StatusBadge";

interface HeaderProps {
  userName: string;
  userRole: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export default function Header({
  userName,
  userRole,
  onToggleSidebar,
  onLogout,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <HiBars3 className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-3 sm:flex">
            <Logo className="h-10" hideText={false} />
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center text-center lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Temenos</p>
            <p className="text-sm font-semibold text-slate-900">Smart Parking Access</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-sm shadow-slate-900/5 sm:flex">
            <span className="font-semibold">{userName}</span>
            <StatusBadge variant="info">{userRole}</StatusBadge>
          </div>
          <Button variant="secondary" onClick={onLogout}>Logout</Button>
        </div>
      </div>
    </header>
  );
}
