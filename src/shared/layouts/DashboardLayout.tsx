import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  HiBuildingOffice2,
  HiChartBar,
  HiChevronDown,
  HiHome,
  HiShieldCheck,
  HiSparkles,
  HiUserPlus,
  HiUsers,
  HiCog,
  HiXMark,
} from "react-icons/hi2";

import { ROUTES } from "../../app/routes";
import useAuth from "../../features/auth/hooks/useAuth";
import Header from "../components/Header";
import Logo from "../components/Logo";

const navItems = [
  { label: "Employee Portal", path: ROUTES.EMPLOYEE, icon: HiHome, roles: ["EMPLOYEE", "DEVELOPER"] },
  { label: "Security Portal", path: ROUTES.SECURITY, icon: HiShieldCheck, roles: ["SECURITY", "DEVELOPER"] },
  { label: "Admin Dashboard", path: ROUTES.ADMIN, icon: HiUsers, roles: ["ADMIN", "DEVELOPER"] },
  { label: "Buildings", path: ROUTES.BUILDINGS, icon: HiBuildingOffice2, roles: ["ADMIN", "DEVELOPER"] },
  { label: "Vehicle Logs", path: ROUTES.VEHICLE_LOGS, icon: HiSparkles, roles: ["SECURITY", "DEVELOPER"] },
  { label: "Settings", path: ROUTES.SETTINGS, icon: HiCog, roles: ["ADMIN", "DEVELOPER"] },
  { label: "Developer", path: ROUTES.DEVELOPER, icon: HiChartBar, roles: ["DEVELOPER"] },
];

const usersSubNav = [
  { label: "View Users", path: ROUTES.USERS, icon: HiUsers },
  { label: "Create User", path: ROUTES.CREATE_USER, icon: HiUserPlus },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const usersSectionActive = location.pathname.startsWith(ROUTES.USERS);
  const [usersMenuOpen, setUsersMenuOpen] = useState(usersSectionActive);

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  const availableNav = navItems.filter((item) => user && item.roles.includes(user.role));
  const showUsersMenu = user && (user.role === "ADMIN" || user.role === "DEVELOPER");
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";
  const userRole = user?.role ?? "Unknown";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        variant="authenticated"
        userName={userName}
        userRole={userRole}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
        onLogout={handleLogout}
      />

      <div className="lg:flex">
        {/* Mobile-only backdrop - the sidebar is a persistent rail at lg: and up, so nothing to dim behind it there. */}
        <div
          className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
            sidebarOpen ? "visible opacity-100" : "invisible opacity-0"
          }`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Drawer on mobile (toggled, overlays content); persistent in-flow rail from lg: up. */}
        <aside
          className={`fixed left-0 top-0 z-50 h-full w-[300px] overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl transition-transform duration-300 lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-4rem)] lg:shrink-0 lg:translate-x-0 lg:shadow-none lg:transition-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <Logo hideText={false} />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <HiXMark className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-6 space-y-1.5">
            {availableNav.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    active ? "bg-temenos-navy text-white shadow-sm shadow-temenos-navy/20" : "text-slate-700 hover:bg-slate-100/80 hover:text-temenos-navy"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-temenos-teal" : "text-slate-500"}`} />
                  {item.label}
                </Link>
              );
            })}

            {showUsersMenu ? (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setUsersMenuOpen((current) => !current)}
                  aria-expanded={usersMenuOpen}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                    usersSectionActive ? "bg-temenos-navy text-white" : "text-slate-700 hover:bg-slate-100 hover:text-temenos-navy"
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <HiUsers className={`h-5 w-5 ${usersSectionActive ? "text-temenos-teal" : "text-slate-500"}`} />
                    User Management
                  </span>
                  <span className={`inline-flex h-5 w-5 items-center justify-center transition-transform duration-200 ${usersMenuOpen ? "rotate-180" : "rotate-0"}`}>
                    <HiChevronDown className="h-4 w-4" />
                  </span>
                </button>

                <div className={`overflow-hidden transition-all duration-200 ${usersMenuOpen ? "max-h-40" : "max-h-0"}`}>
                  <div className="space-y-1 p-2 bg-white border-t border-slate-100">
                    {usersSubNav.map((item) => {
                      const active = location.pathname === item.path;

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            active ? "bg-temenos-teal/15 text-temenos-navy font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <item.icon className="h-4 w-4 text-slate-400" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <main className="space-y-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

