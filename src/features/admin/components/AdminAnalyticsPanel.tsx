import { useEffect, useState } from "react";

import Button from "../../../shared/components/Button";
import { getAdminAnalytics, type AdminAnalytics } from "../../../services/analyticsService";
import { getVehicleLogAudit, getVehicleLogDate, type VehicleLogAudit } from "../../../services/vehicleLogService";

export default function AdminAnalyticsPanel() {
  const [date, setDate] = useState(getVehicleLogDate);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [audit, setAudit] = useState<VehicleLogAudit[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);
    try { setAnalytics(await getAdminAnalytics(date)); } catch { setError("Unable to load analytics."); } finally { setLoading(false); }
  }

  useEffect(() => { void loadAnalytics(); }, [date]);

  async function showAudit(logId: string) {
    setSelectedLog(logId);
    try { setAudit(await getVehicleLogAudit(logId)); } catch { setError("Unable to load audit history."); }
  }

  function exportCsv() {
    if (!analytics) return;
    const rows = ["Vehicle Number,Building,Parking Area,Status,Date", ...analytics.logs.map((log) => [log.vehicleNumber, log.buildingId, log.parkingArea ?? "", log.status ?? "ACTIVE", log.logDate].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url; link.download = `vehicle-report-${date}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  return <section className="space-y-5 rounded-xl bg-white p-5 shadow">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Analytics & Daily Report</h2><p className="mt-1 text-sm text-slate-500">Live parking totals and vehicle-log reporting.</p></div><label className="text-sm font-medium">Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} max={getVehicleLogDate()} className="ml-2 h-10 rounded-lg border px-3" /></label></div>
    {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading || !analytics ? <p className="text-sm text-slate-500">Loading analytics...</p> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Vehicle Entries" value={analytics.vehicleEntries} /><Metric label="Vehicles Inside" value={analytics.activeVehicles} /><Metric label="Exited" value={analytics.exitedVehicles} /><Metric label="Parking Available" value={analytics.totalCapacity - analytics.totalOccupied} /></div><div className="flex justify-end"><Button variant="secondary" onClick={exportCsv}>Download CSV</Button></div><ul className="space-y-2">{analytics.logs.map((log) => <li key={log.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><span className="font-medium">{log.vehicleNumber} · {log.status ?? "ACTIVE"}</span><Button variant="secondary" onClick={() => void showAudit(log.id)}>Audit</Button></li>)}</ul>{selectedLog && <div className="rounded-lg bg-slate-50 p-3"><p className="font-medium">Audit history</p>{audit.length === 0 ? <p className="mt-1 text-sm text-slate-500">No audit changes.</p> : <ul className="mt-2 space-y-1 text-sm">{audit.map((item) => <li key={item.id}>{item.action}{item.reason ? `: ${item.reason}` : ""}</li>)}</ul>}</div>}</>}
  </section>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
