import { Outlet } from "react-router-dom";
import Header from "../components/Header";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header variant="public" />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}