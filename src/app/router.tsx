import { createBrowserRouter } from "react-router-dom";

import { ROUTES } from "./routes";

import EmptyLayout from "../shared/layouts/EmptyLayout";
import AuthLayout from "../shared/layouts/AuthLayout";
import DashboardLayout from "../shared/layouts/DashboardLayout";

import HomePage from "../features/home/pages/HomePage";
import LoginPage from "../features/auth/pages/LoginPage";
import RequireRole from "../features/auth/components/RequireRole";

import EmployeeDashboardPage from "../features/employee/pages/EmployeeDashboardPage";
import SecurityDashboardPage from "../features/security/pages/SecurityDashboardPage";
import VehicleLogsPage from "../features/security/pages/VehicleLogsPage";
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage";
import DeveloperDashboardPage from "../features/developer/pages/DeveloperDashboardPage";

export const router = createBrowserRouter([
  // Public Routes
  {
    element: <EmptyLayout />,
    children: [
      {
        path: ROUTES.HOME,
        element: <HomePage />,
      },
    ],
  },

  // Authentication
  {
    element: <AuthLayout />,
    children: [
      {
        path: ROUTES.LOGIN,
        element: <LoginPage />,
      },
    ],
  },

  // Dashboard Routes
  {
    element: <DashboardLayout />,
    children: [
      {
        path: ROUTES.EMPLOYEE,
        element: <RequireRole allowedRoles={["EMPLOYEE"]}><EmployeeDashboardPage /></RequireRole>,
      },
      {
        path: ROUTES.SECURITY,
        element: <RequireRole allowedRoles={["SECURITY"]}><SecurityDashboardPage /></RequireRole>,
      },
      {
        path: ROUTES.VEHICLE_LOGS,
        element: <RequireRole allowedRoles={["SECURITY"]}><VehicleLogsPage /></RequireRole>,
      },
      {
        path: ROUTES.ADMIN,
        element: <RequireRole allowedRoles={["ADMIN"]}><AdminDashboardPage /></RequireRole>,
      },
      {
        path: ROUTES.DEVELOPER,
        element: <RequireRole allowedRoles={["DEVELOPER"]}><DeveloperDashboardPage /></RequireRole>,
      },
    ],
  },
]);
