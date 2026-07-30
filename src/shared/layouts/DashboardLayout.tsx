import { Outlet, useNavigate } from "react-router-dom";

import { ROUTES } from "../../app/routes";
import useAuth from "../../features/auth/hooks/useAuth";
import Button from "../components/Button";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <p className="font-semibold text-slate-900">Smart Parking</p>
            <p className="text-sm text-slate-500">{user?.firstName || user?.email} · {user?.role}</p>
          </div>
          <Button variant="secondary" onClick={() => void handleLogout()}>Logout</Button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
