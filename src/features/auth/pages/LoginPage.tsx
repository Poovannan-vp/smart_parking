import LoginForm from "../components/LoginForm";
import { useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";
import PageContainer from "../../../shared/components/PageContainer";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <PageContainer>
        <div className="grid min-h-[calc(100vh-80px)] gap-8 lg:grid-cols-[520px_minmax(0,1fr)] lg:items-center">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-800 p-10 shadow-2xl shadow-slate-950/30">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-700 to-transparent opacity-40" />
            <div className="relative space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/70 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-300">
                  <span>Smart Parking</span>
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-white">Enterprise parking management</h1>
                <p className="max-w-md text-base leading-7 text-slate-300">
                  Secure login for employees, security staff, administrators, and developers. Access role-based dashboards and live parking operations.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Live access</p>
                  <p className="mt-3 text-lg font-semibold text-white">Fast workflows for every role</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Secure data</p>
                  <p className="mt-3 text-lg font-semibold text-white">Parking analytics protected</p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-16 top-12 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-10 h-60 w-60 rounded-full bg-sky-500/20 blur-3xl" />
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="mb-6 flex justify-between">
                <Button variant="ghost" onClick={() => navigate("/")}>Back to Home</Button>
              </div>
              <LoginForm />
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
