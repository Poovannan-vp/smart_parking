import { createBrowserRouter } from "react-router-dom";

import { ROUTES } from "./routes";

import EmptyLayout from "../shared/layouts/EmptyLayout";
import AuthLayout from "../shared/layouts/AuthLayout";
import DashboardLayout from "../shared/layouts/DashboardLayout";

import HomePage from "../features/home/pages/HomePage";
import LoginPage from "../features/auth/pages/LoginPage";
import SignUpPage from "../features/auth/pages/SignUpPage";
import RequireRole from "../features/auth/components/RequireRole";

import EmployeeDashboardPage from "../features/employee/pages/EmployeeDashboardPage";
import SecurityDashboardPage from "../features/security/pages/SecurityDashboardPage";
import VehicleLogsPage from "../features/security/pages/VehicleLogsPage";
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage";
import BuildingsPage from "../features/admin/pages/BuildingsPage";
import CreateUserPage from "../features/admin/pages/CreateUserPage";
import SettingsPage from "../features/admin/pages/SettingsPage";
import UsersPage from "../features/admin/pages/UsersPage";
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
      {
        path: ROUTES.SIGNUP,
        element: <SignUpPage />,
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
        element: <RequireRole allowedRoles={["ADMIN", "DEVELOPER"]}><AdminDashboardPage /></RequireRole>,
      },
      {
        path: ROUTES.BUILDINGS,
        element: <RequireRole allowedRoles={["ADMIN", "DEVELOPER"]}><BuildingsPage /></RequireRole>,
      },
      {
        path: ROUTES.USERS,
        element: <RequireRole allowedRoles={["ADMIN", "DEVELOPER"]}><UsersPage /></RequireRole>,
      },
      {
        path: ROUTES.CREATE_USER,
        element: <RequireRole allowedRoles={["ADMIN", "DEVELOPER"]}><CreateUserPage /></RequireRole>,
      },
      {
        path: ROUTES.SETTINGS,
        element: <RequireRole allowedRoles={["ADMIN", "DEVELOPER"]}><SettingsPage /></RequireRole>,
      },
      {
        path: ROUTES.DEVELOPER,
        element: <RequireRole allowedRoles={["DEVELOPER"]}><DeveloperDashboardPage /></RequireRole>,
      },
    ],
  },
]);
