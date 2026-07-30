import LoginForm from "../components/LoginForm";
import { useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="absolute left-4 top-4">
        <Button variant="secondary" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>
      <LoginForm />
    </div>
  );
}
