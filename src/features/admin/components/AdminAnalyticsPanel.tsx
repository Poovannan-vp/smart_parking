import { useCallback, useEffect, useState } from "react";

import Button from "../../../shared/components/Button";
import { getAdminAnalytics, type AdminAnalytics } from "../../../services/analyticsService";
import { getVehicleLogDate } from "../../../services/vehicleLogService";

export default function AdminAnalyticsPanel() {
  const [date, setDate] = useState(getVehicleLogDate);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setAnalytics(await getAdminAnalytics(date));
    } catch {
      setError("Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

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
      ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    ];

    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `vehicle-report-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-5 rounded-xl bg-white p-5 shadow">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Parking overview</h2>
          <p className="mt-1 text-sm text-slate-500">Snapshot of today’s parking capacity and vehicle flow.</p>
        </div>
        <label className="text-sm font-medium">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            max={getVehicleLogDate()}
            className="ml-2 h-10 rounded-lg border px-3"
          />
        </label>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {loading || !analytics ? (
        <p className="text-sm text-slate-500">Loading overview...</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Vehicle entries" value={analytics.vehicleEntries} />
            <Metric label="Vehicles inside" value={analytics.activeVehicles} />
            <Metric label="Exited" value={analytics.exitedVehicles} />
            <Metric label="Spaces free" value={analytics.totalCapacity - analytics.totalOccupied} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Detailed vehicle logs are available on the Vehicle Logs page.</p>
            <Button variant="secondary" onClick={exportCsv}>Download CSV</Button>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
