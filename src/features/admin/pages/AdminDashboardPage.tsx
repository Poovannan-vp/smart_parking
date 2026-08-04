import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import AdminAnalyticsPanel from "../components/AdminAnalyticsPanel";
import { getAdminAnalytics, type AdminAnalytics } from "../../../services/analyticsService";
import { getManagedBuildings, type ManagedBuilding } from "../../../services/buildingService";
import { getManagedUsers, type ManagedUser } from "../../../services/userService";
import { ROUTES } from "../../../app/routes";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [buildings, setBuildings] = useState<ManagedBuilding[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [analyticsData, buildingData, userData] = await Promise.all([
        getAdminAnalytics(logDate),
        getManagedBuildings(),
        getManagedUsers(),
      ]);

      setAnalytics(analyticsData);
      setBuildings(buildingData);
      setUsers(userData);
    } catch {
      setError("Unable to load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [logDate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const openBuildings = buildings.filter((building) => building.status === "Open").length;
  const totalAvailable = analytics ? analytics.totalCapacity - analytics.totalOccupied : 0;

  return (
    <PageContainer>
      <div className="mx-auto max-w-7xl space-y-8 py-8">
        <PageHeader
          title="Admin Dashboard"
          subtitle="A single enterprise view for buildings, users, and parking performance."
          actions={
            <Button variant="secondary" onClick={() => navigate(ROUTES.BUILDINGS)}>
              Manage Buildings
            </Button>
          }
        />

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Buildings" value={buildings.length} />
          <SummaryCard label="Open Buildings" value={openBuildings} />
          <SummaryCard label="Registered Users" value={users.length} />
          <SummaryCard label="Available Spaces" value={totalAvailable} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Operational summary</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">What matters most</h2>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={() => setLogDate(new Date().toISOString().slice(0, 10))}
              >
                Refresh date
              </button>
            </div>

            {loading || !analytics ? (
              <p className="mt-6 text-sm text-slate-500">Loading dashboard metrics…</p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Metric label="Vehicle entries" value={analytics.vehicleEntries} />
                <Metric label="Active vehicles" value={analytics.activeVehicles} />
                <Metric label="Exited vehicles" value={analytics.exitedVehicles} />
                <Metric label="Voided logs" value={analytics.voidedVehicles} />
              </div>
            )}

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Quick links</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" fullWidth onClick={() => navigate(ROUTES.USERS)}>
                  View Users
                </Button>
                <Button variant="secondary" fullWidth onClick={() => navigate(ROUTES.CREATE_USER)}>
                  Create User
                </Button>
              </div>
            </div>
          </Card>

          <AdminAnalyticsPanel />
        </div>
      </div>
    </PageContainer>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm shadow-slate-200/40">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-200/40">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
