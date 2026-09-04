import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiBars3, HiXMark } from "react-icons/hi2";
import Button from "./Button";
import Logo from "./Logo";
import StatusBadge from "./StatusBadge";
import { ROUTES } from "../../app/routes";

interface HeaderProps {
  variant?: "public" | "authenticated";
  userName?: string;
  userRole?: string;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
}

export default function Header({
  variant = "authenticated",
  userName,
  userRole,
  onToggleSidebar,
  onLogout,
}: HeaderProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPublic = variant === "public" || (!userName && !userRole);

  const handleHomeClick = () => {
    if (window.location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
  };

  const handleHowItWorksClick = () => {
    if (window.location.pathname === "/") {
      const el = document.getElementById("how-it-works");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      navigate("/#how-it-works");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {!isPublic && onToggleSidebar ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Toggle navigation drawer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-temenos-teal lg:hidden"
            >
              <HiBars3 className="h-5 w-5" />
            </button>
          ) : null}

          <Link to="/" className="flex items-center transition opacity-100 hover:opacity-90">
            <Logo hideText={false} />
          </Link>
        </div>

        {/* Center / Title section for Authenticated */}
        {!isPublic ? (
          <div className="hidden items-center gap-2 text-center md:flex">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-temenos-teal">Enterprise Portal</span>
            <span className="text-slate-300">•</span>
            <span className="text-sm font-semibold text-temenos-navy">Smart Parking System</span>
          </div>
        ) : null}

        {/* Center / Navigation section for Public Desktop */}
        {isPublic ? (
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <button
              type="button"
              onClick={handleHomeClick}
              className="transition hover:text-temenos-teal"
            >
              Home
            </button>
            <button
              type="button"
              onClick={handleHowItWorksClick}
              className="transition hover:text-temenos-teal"
            >
              How It Works
            </button>
          </nav>
        ) : null}

        {/* Right section for Public */}
        {isPublic ? (
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="teal" onClick={() => navigate(ROUTES.LOGIN)}>
              Login
            </Button>
          </div>
        ) : null}

        {/* Right section for Authenticated */}
        {!isPublic ? (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-1.5 text-sm sm:flex">
              <span className="font-semibold text-slate-800">{userName || "User"}</span>
              {userRole ? <StatusBadge variant="info">{userRole}</StatusBadge> : null}
            </div>
            {onLogout ? (
              <Button variant="secondary" onClick={onLogout}>
                Logout
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Mobile Hamburger for Public */}
        {isPublic ? (
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((curr) => !curr)}
              aria-label="Toggle mobile menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {mobileMenuOpen ? <HiXMark className="h-6 w-6" /> : <HiBars3 className="h-6 w-6" />}
            </button>
          </div>
        ) : null}
      </div>

      {/* Mobile dropdown menu for Public */}
      {isPublic && mobileMenuOpen ? (
        <div className="border-b border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleHomeClick();
              }}
              className="text-left py-2 text-slate-700 hover:text-temenos-teal"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleHowItWorksClick();
              }}
              className="text-left py-2 text-slate-700 hover:text-temenos-teal"
            >
              How It Works
            </button>
            <div className="pt-2 flex flex-col gap-2">
              <Button variant="teal" fullWidth onClick={() => navigate(ROUTES.LOGIN)}>
                Login
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

