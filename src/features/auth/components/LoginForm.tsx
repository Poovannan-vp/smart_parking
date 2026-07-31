import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Input from "../../../shared/components/Input";
import useAuth from "../hooks/useAuth";
import { getDashboardRoute } from "../services/authServices";

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? getDashboardRoute(user.role), { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm rounded-[2rem] p-8 shadow-2xl shadow-slate-900/10">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Smart Parking Portal</p>
          <h1 className="text-3xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500">Access your role-based dashboard for live parking operations.</p>
        </div>

        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="name@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            Remember me
          </label>
          <button type="button" className="text-slate-500 hover:text-slate-700" onClick={(event) => event.preventDefault()}>
            Forgot password?
          </button>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">
            {error}
          </div>
        )}

        <Button fullWidth type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Continue"}
        </Button>
      </form>
    </Card>
  );
}
