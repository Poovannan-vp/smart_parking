import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Alert from "../../../shared/components/Alert";
import LoadingState from "../../../shared/components/LoadingState";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import { getAdminAnalytics, type AdminAnalytics } from "../../../services/analyticsService";
import { getManagedBuildings, type ManagedBuilding } from "../../../services/buildingService";
import { getManagedUsers, type ManagedUser } from "../../../services/userService";
import { getVehicleLogDate } from "../../../services/vehicleLogService";
import { ROUTES } from "../../../app/routes";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [buildings, setBuildings] = useState<ManagedBuilding[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logDate, setLogDate] = useState(getVehicleLogDate);

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

  function exportCsv() {
    if (!analytics) return;

    const rows = [
      "Vehicle Number,Building,Parking Area,Status,Date",
      ...analytics.logs.map((log) => [
        log.vehicleNumber,
        log.buildingId,
        log.parkingArea ?? "",
        log.status ?? "ACTIVE",
        log.logDate,
      ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")),
    ];

    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `vehicle-report-${logDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-8 py-8">
        <PageHeader
          title="Admin Dashboard"
          subtitle="A single enterprise view for buildings, users, and parking performance."
          actions={
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => navigate(ROUTES.PARKING_LAYOUTS)}>
                Parking Layouts
              </Button>
              <Button variant="secondary" onClick={() => navigate(ROUTES.BUILDINGS)}>
                Manage Buildings
              </Button>
            </div>
          }
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Buildings" value={buildings.length} />
          <SummaryCard label="Open Buildings" value={openBuildings} />
          <SummaryCard label="Registered Users" value={users.length} />
          <SummaryCard label="Available Spaces" value={totalAvailable} />
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Operational summary</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Today's parking &amp; vehicle activity</h2>
            </div>
            <label className="text-sm font-semibold text-slate-800">
              Date
              <input
                type="date"
                value={logDate}
                max={getVehicleLogDate()}
                onChange={(event) => setLogDate(event.target.value)}
                className="ml-2 h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-temenos-teal focus:ring-2 focus:ring-temenos-teal/20"
              />
            </label>
          </div>

          {loading || !analytics ? (
            <div className="mt-6">
              <LoadingState message="Loading dashboard metrics…" inline />
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Metric label="Vehicle entries" value={analytics.vehicleEntries} />
                <Metric label="Active vehicles" value={analytics.activeVehicles} />
                <Metric label="Exited vehicles" value={analytics.exitedVehicles} />
                <Metric label="Voided logs" value={analytics.voidedVehicles} />
                <Metric label="Spaces free" value={totalAvailable} />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <p className="text-sm text-slate-500">Detailed vehicle logs are available on the Vehicle Logs page.</p>
                <Button variant="secondary" onClick={exportCsv}>
                  Download CSV
                </Button>
              </div>
            </>
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
      </div>
    </PageContainer>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60 transition-shadow hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
