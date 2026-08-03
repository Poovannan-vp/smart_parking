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
} from "react-icons/hi2";

import { ROUTES } from "../../app/routes";
import useAuth from "../../features/auth/hooks/useAuth";
import Header from "../components/Header";

const navItems = [
  { label: "Employee", path: ROUTES.EMPLOYEE, icon: HiHome, roles: ["EMPLOYEE", "DEVELOPER"] },
  { label: "Security", path: ROUTES.SECURITY, icon: HiShieldCheck, roles: ["SECURITY", "DEVELOPER"] },
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
        userName={userName}
        userRole={userRole}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
        onLogout={handleLogout}
      />

      <div className="relative">
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${sidebarOpen ? "visible opacity-100" : "invisible opacity-0"}`}>
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setSidebarOpen(false)} />
          <aside className={`absolute left-0 top-0 z-50 h-full w-[320px] overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src="/images/T-logo.svg" alt="Temenos logo" className="h-10 w-auto" />
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Navigation</p>
                  <p className="text-base font-semibold text-slate-900">Smart Parking</p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation"
              >
                ×
              </button>
            </div>

            <nav className="mt-8 space-y-2">
              {availableNav.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                      active ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}

              {showUsersMenu ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setUsersMenuOpen((current) => !current)}
                    aria-expanded={usersMenuOpen}
                    className={`flex w-full items-center justify-between gap-3 rounded-3xl px-4 py-3 text-left text-sm font-semibold transition ${
                      usersSectionActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <HiUsers className="h-5 w-5" />
                      Users
                    </span>
                    <span className={`inline-flex h-5 w-5 items-center justify-center text-slate-500 transition-transform duration-200 ${usersMenuOpen ? "rotate-180" : "rotate-0"}`}>
                      <HiChevronDown className="h-4 w-4" />
                    </span>
                  </button>

                  <div className={`overflow-hidden transition-all duration-200 ${usersMenuOpen ? "max-h-40" : "max-h-0"}`}>
                    <div className="space-y-1 px-2 pb-3 pt-2">
                      {usersSubNav.map((item) => {
                        const active = location.pathname === item.path;

                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 rounded-3xl px-4 py-2 text-sm transition ${
                              active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            } ${usersMenuOpen ? "pl-8" : "pl-4"}`}
                          >
                            <item.icon className="h-4 w-4" />
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
        </div>

        <div className="mx-auto max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <main className="space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
