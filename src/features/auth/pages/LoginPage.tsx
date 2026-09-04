import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Logo from "../../../shared/components/Logo";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-5xl my-auto">
      <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        {/* Info Card */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-10 shadow-sm">
            <div className="space-y-6">
              <Logo hideText={false} />

              <div>
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-temenos-teal">Internal Enterprise Portal</span>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-temenos-navy sm:text-4xl">
                  Enterprise Parking Access
                </h1>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  Sign in with your company credentials to view your office parking layout and access your role's dashboard.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-temenos-teal">Role Access</span>
                  <p className="mt-2 text-sm font-semibold text-temenos-navy">Employees, Security & Administrators</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-temenos-teal">Live Operations</span>
                  <p className="mt-2 text-sm font-semibold text-temenos-navy">Real-time parking slot status</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex justify-center">
          <Card className="w-full shadow-lg">
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-base font-bold text-temenos-navy">Staff Login</p>
                <p className="text-xs uppercase tracking-[0.2em] text-temenos-teal">Secure Authentication</p>
              </div>
              <Button variant="ghost" className="text-xs" onClick={() => navigate("/")}>
                Back Home
              </Button>
            </div>
            <LoginForm />
          </Card>
        </div>
      </div>
    </div>
  );
}

