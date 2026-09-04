import { useNavigate } from "react-router-dom";

import { ROUTES } from "../../../app/routes";
import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-8 py-8">
        <PageHeader
          title="Settings"
          subtitle="Configure portal preferences, security policies, and system access controls."
          actions={
            <>
              <Button variant="secondary" onClick={() => navigate(ROUTES.ADMIN)}>
                Back to Admin
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Refresh status
              </Button>
            </>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">System settings</p>
              <h2 className="text-2xl font-semibold text-slate-900">Portal configuration</h2>
              <p className="text-sm leading-7 text-slate-600">
                The settings area is reserved for application preferences and security controls. Use this page to view current configuration and manage high-level system access.
              </p>
            </div>

            <div className="mt-8 grid gap-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-900">Theme</p>
                <p className="mt-2 text-sm text-slate-600">Enterprise styling for consistent visual hierarchy and polished brand experience.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-900">User access</p>
                <p className="mt-2 text-sm text-slate-600">User accounts, roles and permissions are managed from the user management section.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-900">Audit logs</p>
                <p className="mt-2 text-sm text-slate-600">Vehicle log and audit data are available via the Vehicle Logs page.</p>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Help & support</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Need administrator help?</h2>
            </div>
            <p className="text-sm text-slate-600">
              If you need to adjust access, integrations, or application behavior, contact the platform owner or IT team.
            </p>
            <Button as="a" href="mailto:it-support@company.com" variant="primary" className="w-full justify-center">
              Contact support
            </Button>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
