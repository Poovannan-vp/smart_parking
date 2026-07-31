import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { HiChartBar, HiHome, HiShieldCheck, HiSparkles, HiUsers } from "react-icons/hi2";

import { ROUTES } from "../../app/routes";
import useAuth from "../../features/auth/hooks/useAuth";
import Button from "../components/Button";

const navItems = [
  { label: "Employee", path: ROUTES.EMPLOYEE, icon: HiHome, roles: ["EMPLOYEE", "DEVELOPER"] },
  { label: "Security", path: ROUTES.SECURITY, icon: HiShieldCheck, roles: ["SECURITY", "DEVELOPER"] },
  { label: "Vehicle Logs", path: ROUTES.VEHICLE_LOGS, icon: HiSparkles, roles: ["SECURITY", "DEVELOPER"] },
  { label: "Admin", path: ROUTES.ADMIN, icon: HiUsers, roles: ["ADMIN", "DEVELOPER"] },
  { label: "Developer", path: ROUTES.DEVELOPER, icon: HiChartBar, roles: ["DEVELOPER"] },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  const availableNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm shadow-slate-900/10">SP</div>
            <div>
              <p className="text-sm font-semibold tracking-[0.16em] uppercase text-slate-500">Smart Parking</p>
              <p className="text-sm text-slate-600">Enterprise portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-700 shadow-sm shadow-slate-900/5 md:flex">
              <span className="font-semibold">{user?.firstName || user?.email}</span>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm shadow-slate-900/5">{user?.role}</span>
            </div>
            <Button variant="secondary" onClick={() => void handleLogout()}>Logout</Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:block">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Navigation</p>
          </div>
          <nav className="space-y-2">
            {availableNav.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                    active ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
