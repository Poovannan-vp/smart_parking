import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "../../../app/routes";
import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import StatusBadge from "../../../shared/components/StatusBadge";
import Alert from "../../../shared/components/Alert";
import LoadingState from "../../../shared/components/LoadingState";
import {
  getDeveloperDiagnostics,
  type DeveloperDiagnostics,
} from "../../../services/developerDiagnosticsService";

export default function DeveloperDashboardPage() {
  const navigate = useNavigate();
  const [diagnostics, setDiagnostics] = useState<DeveloperDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  async function loadDiagnostics() {
  setLoading(true);
  setError(null);

  try {
    setDiagnostics(await getDeveloperDiagnostics());
    setCheckedAt(new Date());
  } catch (diagnosticsError) {
    console.error("Developer diagnostics error:", diagnosticsError);
    setError("Unable to read Firestore diagnostics. Check the connection and access rules.");
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    void loadDiagnostics();
  }, []);

  const errorCount = diagnostics?.issues.filter((issue) => issue.severity === "error").length ?? 0;
  const warningCount = diagnostics?.issues.filter((issue) => issue.severity === "warning").length ?? 0;

  function exportDiagnostics() {
    if (!diagnostics) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(diagnostics, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "smart-parking-diagnostics.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-8 py-8">
        <PageHeader
          title="Developer Dashboard"
          subtitle="System diagnostics, Firestore health, and cross-role testing in one view."
          actions={
            <Button variant="secondary" onClick={() => void loadDiagnostics()} disabled={loading}>
              {loading ? "Checking..." : "Refresh Diagnostics"}
            </Button>
          }
        />

        <Card className="border-amber-200 bg-amber-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-900">Role Testing</p>
              <p className="mt-2 text-sm text-amber-800">Developer access is enabled for all portals. Keep this restricted in production.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => navigate(ROUTES.EMPLOYEE)}>Employee</Button>
              <Button variant="secondary" onClick={() => navigate(ROUTES.SECURITY)}>Security</Button>
              <Button variant="secondary" onClick={() => navigate(ROUTES.ADMIN)}>Admin</Button>
            </div>
          </div>
        </Card>

        {error ? <Alert variant="error">{error}</Alert> : null}

        {loading && !diagnostics ? (
          <Card>
            <LoadingState message="Checking Firestore data..." inline />
          </Card>
        ) : diagnostics ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Firestore" value="Connected" tone="success" />
              <MetricCard label="Buildings" value={diagnostics.buildingCount} />
              <MetricCard label="Parking Areas" value={diagnostics.parkingAreaCount} />
              <MetricCard label="Vehicle Logs" value={diagnostics.vehicleLogCount} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Data Health</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">Firestore diagnostics</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm font-medium">
                    <StatusBadge variant={errorCount > 0 ? "danger" : "success"}>{errorCount} errors</StatusBadge>
                    <StatusBadge variant={warningCount > 0 ? "warning" : "info"}>{warningCount} warnings</StatusBadge>
                  </div>
                </div>

                <div className="mt-5 text-sm text-slate-500">
                  {checkedAt ? `Last checked ${checkedAt.toLocaleTimeString("en-IN")}` : "No diagnostics run yet."}
                </div>

                {diagnostics.issues.length === 0 ? (
                  <Alert variant="success" className="mt-6">
                    No configuration or occupancy problems were found.
                  </Alert>
                ) : (
                  <ul className="mt-6 space-y-3">
                    {diagnostics.issues.map((issue) => (
                      <li key={issue.id} className={`rounded-3xl border p-4 ${issue.severity === "error" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{issue.title}</p>
                          <StatusBadge variant={issue.severity === "error" ? "danger" : "warning"}>{issue.severity}</StatusBadge>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{issue.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Recent audits</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Vehicle-log history</h2>
                  </div>
                  <Button variant="secondary" onClick={exportDiagnostics}>Export JSON</Button>
                </div>

                {diagnostics.recentAudits.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-500">No audit events found.</p>
                ) : (
                  <ul className="mt-6 space-y-3">
                    {diagnostics.recentAudits.map((audit) => (
                      <li key={audit.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-900">{audit.action ?? "Audit event"}</p>
                          <span className="text-slate-500">{audit.correctedBy ? `By ${audit.correctedBy}` : null}</span>
                        </div>
                        {audit.reason ? <p className="mt-2 text-slate-600">{audit.reason}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <p className="text-sm text-slate-500">
              This page normally reads operational data. The Role Testing panel above is temporarily enabled for development.
            </p>
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success";
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone === "success" ? "text-emerald-600" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
