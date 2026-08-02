import { Link } from "react-router-dom";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Logo from "../../../shared/components/Logo";
import PageContainer from "../../../shared/components/PageContainer";
import { ROUTES } from "../../../app/routes";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 text-slate-900">
      <PageContainer>
        <div className="mx-auto max-w-3xl">
          <Card className="overflow-hidden border border-slate-200 bg-white p-10 shadow-sm shadow-slate-200/60">
            <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:items-center">
              <div className="flex items-center justify-center rounded-[1.75rem] bg-slate-50 p-10">
                <div className="grid h-24 w-24 place-items-center rounded-[1.5rem] bg-white shadow-sm shadow-slate-200/60">
                  <Logo className="h-10" hideText={true} />
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Request access</p>
                  <h1 className="text-3xl font-semibold text-slate-900">Access is granted by your company administrator.</h1>
                  <p className="text-sm leading-7 text-slate-600">This application is available only to authorized employees. User accounts are created by the Company Administrator or IT team during onboarding. Self-registration is not supported.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Button as="a" href="mailto:it-support@company.com" className="w-full justify-center" variant="primary">
                    Contact Administrator
                  </Button>
                  <Button as={Link} to={ROUTES.LOGIN} className="w-full justify-center" variant="secondary">
                    Back to Login
                  </Button>
                </div>

                <p className="text-sm text-slate-500">If you already have a company account, please sign in on the login page.</p>
              </div>
            </div>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
