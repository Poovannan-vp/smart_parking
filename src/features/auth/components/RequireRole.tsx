import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { ROUTES } from "../../../app/routes";
import type { UserRole } from "../../../types/common";
import useAuth from "../hooks/useAuth";
import { getDashboardRoute } from "../services/authServices";

export default function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Checking access...</div>;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(user.role) && user.role !== "DEVELOPER") {
    return <Navigate to={getDashboardRoute(user.role)} replace />;
  }

  return <>{children}</>;
}
