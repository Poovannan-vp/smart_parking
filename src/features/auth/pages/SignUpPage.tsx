import { Link } from "react-router-dom";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Logo from "../../../shared/components/Logo";
import { ROUTES } from "../../../app/routes";

export default function SignUpPage() {
  return (
    <div className="w-full max-w-2xl my-auto">
      <Card className="p-8 sm:p-10 shadow-lg">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <Logo hideText={false} />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-temenos-teal">Request Access</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-temenos-navy">
              Access Granted by Administrator
            </h1>
            <p className="text-sm leading-relaxed text-slate-600">
              This Smart Parking system is reserved for authorized Temenos employees and security staff. Accounts are provisioned by your System Administrator or IT team during onboarding. Self-registration is restricted.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-temenos-navy">Need an Account?</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you are a new employee or require updated role permissions (Security, Admin), please submit an access request to your IT Support team.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button as="a" href="mailto:it-support@temenos.com" className="flex-1" variant="primary">
              Contact IT Administrator
            </Button>
            <Button as={Link} to={ROUTES.LOGIN} className="flex-1" variant="secondary">
              Return to Login
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

