import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="email"
        type="email"
        label="Email address"
        placeholder="employee@temenos.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <Input
        id="password"
        type="password"
        label="Password"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      <div className="flex items-center justify-between text-sm text-slate-600 pt-1">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#0F2042] focus:ring-[#00A3E0]"
          />
          <span className="text-xs text-slate-600">Remember me</span>
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700" role="alert">
          {error}
        </div>
      )}

      <Button fullWidth type="submit" variant="primary" disabled={loading} className="py-3">
        {loading ? "Signing in..." : "Sign in to Dashboard"}
      </Button>
    </form>
  );
}

