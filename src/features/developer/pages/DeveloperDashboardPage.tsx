import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "../../../app/routes";
import Button from "../../../shared/components/Button";
import PageContainer from "../../../shared/components/PageContainer";
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
    } catch {
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
      <div className="mx-auto max-w-5xl space-y-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Developer Dashboard</h1>
            <p className="mt-1 text-slate-500">Read-only system health and data-quality monitoring.</p>
          </div>
          <Button variant="secondary" onClick={() => void loadDiagnostics()} disabled={loading}>
            {loading ? "Checking..." : "Refresh Diagnostics"}
          </Button>
        </div>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">Role Testing</h2>
          <p className="mt-1 text-sm text-amber-800">Developer test access is enabled for every portal. Restrict this before production.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate(ROUTES.EMPLOYEE)}>Employee Portal</Button>
            <Button variant="secondary" onClick={() => navigate(ROUTES.SECURITY)}>Security Portal</Button>
            <Button variant="secondary" onClick={() => navigate(ROUTES.ADMIN)}>Admin Portal</Button>
          </div>
        </section>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

        {loading && !diagnostics ? (
          <div className="rounded-xl bg-white p-5 shadow text-slate-500">Checking Firestore data...</div>
        ) : diagnostics ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Firestore" value="Connected" tone="success" />
              <MetricCard label="Buildings" value={diagnostics.buildingCount} />
              <MetricCard label="Parking Areas" value={diagnostics.parkingAreaCount} />
              <MetricCard label="Vehicle Logs" value={diagnostics.vehicleLogCount} />
            </section>

            <section className="rounded-xl bg-white p-5 shadow">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Data Health</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {checkedAt ? `Last checked ${checkedAt.toLocaleTimeString("en-IN")}` : "Not checked yet"}
                  </p>
                </div>
                <div className="flex gap-2 text-sm font-medium">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">{errorCount} errors</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{warningCount} warnings</span>
                </div>
              </div>

              {diagnostics.issues.length === 0 ? (
                <p className="mt-5 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                  No configuration or occupancy problems were found.
                </p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {diagnostics.issues.map((issue) => (
                    <li
                      key={issue.id}
                      className={`rounded-lg border p-4 ${
                        issue.severity === "error"
                          ? "border-red-200 bg-red-50"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <p className="font-medium text-slate-800">{issue.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{issue.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl bg-white p-5 shadow">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Recent Vehicle-Log Audits</h2><p className="mt-1 text-sm text-slate-500">Latest correction, void, and exit actions.</p></div><Button variant="secondary" onClick={exportDiagnostics}>Export Diagnostics</Button></div>
              {diagnostics.recentAudits.length === 0 ? <p className="mt-4 text-sm text-slate-500">No audit events found.</p> : <ul className="mt-4 space-y-2">{diagnostics.recentAudits.map((audit) => <li key={audit.id} className="rounded-lg border border-slate-200 p-3 text-sm"><span className="font-medium">{audit.action ?? "Audit event"}</span>{audit.reason ? ` · ${audit.reason}` : ""}</li>)}</ul>}
            </section>

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
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone === "success" ? "text-green-600" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
