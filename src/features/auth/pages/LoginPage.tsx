import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Logo from "../../../shared/components/Logo";
import PageContainer from "../../../shared/components/PageContainer";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PageContainer>
        <div className="grid min-h-[calc(100vh-80px)] gap-8 lg:grid-cols-[520px_minmax(0,1fr)] lg:items-center">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-10 shadow-sm shadow-slate-200/60">
            <div className="space-y-8">
              <div className="space-y-3">
                <Logo className="h-10" hideText={false} />
                <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Company parking access portal</h1>
                <p className="max-w-md text-base leading-7 text-slate-600">
                  Log in with your company credentials to access parking status, vehicle registration, and role-specific dashboards.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="bg-slate-50 p-5 shadow-sm shadow-slate-200/60">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">App access</p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">Login for staff and administrators</p>
                </Card>
                <Card className="bg-slate-50 p-5 shadow-sm shadow-slate-200/60">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Operational view</p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">Live parking occupancy and branch status</p>
                </Card>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <Card>
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Staff login</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Secure access portal</p>
                  </div>
                  <Button variant="ghost" className="text-slate-700 hover:text-slate-900" onClick={() => navigate("/")}>Back</Button>
                </div>
                <LoginForm />
              </Card>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
