import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import BuildingSelector from "../../home/components/BuildingSelector";
import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Input from "../../../shared/components/Input";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import EmptyState from "../../../shared/components/EmptyState";
import LoadingState from "../../../shared/components/LoadingState";
import StatusBadge from "../../../shared/components/StatusBadge";
import useAuth from "../../auth/hooks/useAuth";
import {
  getBuildings,
  subscribeToBuilding,
  type BuildingOption,
} from "../../../services/buildingService";
import {
  correctVehicleLog,
  createVehicleLog,
  exitVehicleLog,
  getVehicleLogDate,
  getVehicleLogs,
  normalizeVehicleNumber,
  voidVehicleLog,
  type VehicleLog,
} from "../../../services/vehicleLogService";
import type { Parking } from "../../../types/parking";

const parkingAreaLabels: Record<keyof Parking, string> = {
  closedBike: "Closed Bike",
  closedCar: "Closed Car",
  openCar: "Open Car",
  general: "General",
};

function formatLoggedAt(loggedAt?: VehicleLog["loggedAt"]) {
  return loggedAt?.toDate().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }) ?? "Saving...";
}

export default function VehicleLogsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDeveloper = user?.role === "DEVELOPER";
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [parkingArea, setParkingArea] = useState<keyof Parking | "">("");
  const [availableParkingAreas, setAvailableParkingAreas] = useState<Array<keyof Parking>>([]);
  const [logDate, setLogDate] = useState(getVehicleLogDate);
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [editingLog, setEditingLog] = useState<VehicleLog | null>(null);
  const [editAction, setEditAction] = useState<"CORRECT" | "VOID">("CORRECT");
  const [editParkingArea, setEditParkingArea] = useState<keyof Parking | "">("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeBuildingId = isDeveloper ? selectedBuilding : (user?.buildingId ?? "");
  const activeBuildingName = buildings.find((building) => building.id === activeBuildingId)?.name;

  useEffect(() => {
    async function loadBuildings() {
      try {
        const data = await getBuildings();
        setBuildings(data);

        if (isDeveloper) setSelectedBuilding(data[0]?.id ?? "");
      } catch {
        setError("Unable to load buildings.");
      }
    }

    void loadBuildings();
  }, [isDeveloper]);

  useEffect(() => {
    if (!activeBuildingId) {
      setAvailableParkingAreas([]);
      setParkingArea("");
      return;
    }

    return subscribeToBuilding(
      activeBuildingId,
      (building) => {
        const areas = (Object.keys(building?.parking ?? {}) as Array<keyof Parking>)
          .filter((area) => Boolean(building?.parking[area]));
        setAvailableParkingAreas(areas);
        setParkingArea((currentArea) => areas.includes(currentArea as keyof Parking) ? currentArea : (areas[0] ?? ""));
      },
      () => setError("Unable to load the assigned building's parking areas."),
    );
  }, [activeBuildingId]);

  async function loadLogs() {
    if (!activeBuildingId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      setLogs(await getVehicleLogs(activeBuildingId, logDate));
    } catch {
      setError("Unable to load vehicle logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, [activeBuildingId, logDate]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = normalizeVehicleNumber(search);
    return logs.filter((log) => log.vehicleNumber.includes(normalizedSearch));
  }, [logs, search]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!activeBuildingId || !parkingArea) {
      setError("No assigned building or parking area is available.");
      return;
    }

    setSaving(true);

    try {
      await createVehicleLog({ buildingId: activeBuildingId, vehicleNumber, parkingArea });
      setVehicleNumber("");
      setSuccess("Vehicle logged for today.");
      await loadLogs();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save the vehicle log.");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(log: VehicleLog, action: "CORRECT" | "VOID") {
    setEditingLog(log);
    setEditAction(action);
    setEditParkingArea(log.parkingArea ?? availableParkingAreas[0] ?? "");
    setReason("");
    setError(null);
    setSuccess(null);
  }

  async function handleCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLog || !user || !reason.trim()) {
      setError("Enter a reason for this change.");
      return;
    }
    if (editAction === "CORRECT" && !editParkingArea) {
      setError("Select the corrected parking area.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editAction === "VOID") {
        await voidVehicleLog({ logId: editingLog.id, reason, correctedBy: user.uid });
        setSuccess("Vehicle log voided; its audit record was retained.");
      } else {
        await correctVehicleLog({
          logId: editingLog.id,
          parkingArea: editParkingArea as keyof Parking,
          reason,
          correctedBy: user.uid,
        });
        setSuccess("Vehicle log corrected and audited.");
      }

      setEditingLog(null);
      await loadLogs();
    } catch (correctionError) {
      setError(correctionError instanceof Error ? correctionError.message : "Unable to update the vehicle log.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExit(log: VehicleLog) {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      await exitVehicleLog({ logId: log.id, correctedBy: user.uid });
      setSuccess(`${log.vehicleNumber} marked as exited.`);
      await loadLogs();
    } catch (exitError) {
      setError(exitError instanceof Error ? exitError.message : "Unable to record vehicle exit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-5xl space-y-8 py-8">
        <PageHeader
          title="Vehicle Logs"
          subtitle="Manage vehicle entries, exits, and audit corrections for your assigned building."
          actions={
            <Button variant="secondary" onClick={() => navigate("/security")}>Back to Security</Button>
          }
        />

        {isDeveloper ? (
          <Card className="space-y-4">
            <p className="text-sm font-semibold text-slate-700">Developer building selector</p>
            <BuildingSelector buildings={buildings} selectedBuilding={selectedBuilding} onChange={setSelectedBuilding} />
          </Card>
        ) : null}

        {!isDeveloper && !activeBuildingId ? (
          <EmptyState
            title="No assigned building"
            description="Your account has not been assigned to a building. Ask an Admin to assign one so you can manage vehicle logs."
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">New Gate Entry</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Log a vehicle</h2>
              </div>
              <div className="text-sm text-slate-500">{isDeveloper ? "Developer mode" : `Assigned building: ${activeBuildingName ?? "Loading..."}`}</div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreate}>
              <Input
                id="vehicleNumber"
                label="Vehicle Number"
                placeholder="TN01AB1234"
                value={vehicleNumber}
                onChange={(event) => setVehicleNumber(event.target.value)}
                onBlur={() => setVehicleNumber((value) => normalizeVehicleNumber(value))}
                required
              />
              <ParkingAreaSelect id="parkingArea" label="Parking Area" value={parkingArea} areas={availableParkingAreas} onChange={setParkingArea} />
              <Button fullWidth type="submit" disabled={saving || !activeBuildingId}>
                {saving ? "Saving..." : "Log Vehicle"}
              </Button>
            </form>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Vehicle History</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Recent logs</h2>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div>Selected building:</div>
                <div className="font-medium text-slate-900">{activeBuildingName ?? "Loading..."}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <Input
                id="vehicleSearch"
                label="Search Vehicle Number"
                placeholder="TN01AB1234"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <label className="block text-sm font-semibold text-slate-700">
                Date
                <input
                  type="date"
                  value={logDate}
                  max={getVehicleLogDate()}
                  onChange={(event) => setLogDate(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>

            {loading ? (
              <LoadingState message="Loading vehicle history..." />
            ) : filteredLogs.length === 0 ? (
              <EmptyState title="No vehicle logs found" description="Try another date or search term." />
            ) : (
              <ul className="mt-6 space-y-4">
                {filteredLogs.map((log) => (
                  <li key={log.id} className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{log.vehicleNumber}</p>
                        <p className="mt-1 text-sm text-slate-500">{log.parkingArea ? parkingAreaLabels[log.parkingArea] : "Parking area not selected"} · {formatLoggedAt(log.loggedAt)}</p>
                      </div>
                      <StatusBadge variant={log.status === "EXITED" ? "info" : log.status === "VOID" ? "warning" : "success"}>
                        {log.status ?? "ACTIVE"}
                      </StatusBadge>
                    </div>

                    {(log.status ?? "ACTIVE") === "ACTIVE" && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button variant="secondary" onClick={() => void handleExit(log)} disabled={saving}>Mark Exit</Button>
                        <Button variant="secondary" onClick={() => beginEdit(log, "CORRECT")}>Correct</Button>
                        <Button variant="danger" onClick={() => beginEdit(log, "VOID")}>Void</Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {editingLog ? (
          <form onSubmit={handleCorrection}>
            <Card className="border-amber-200 bg-amber-50">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editAction === "VOID" ? "Void" : "Correct"} {editingLog.vehicleNumber}</h2>
                <p className="mt-1 text-sm text-slate-600">A reason is required and saved in the audit trail.</p>
              </div>

              <div className="mt-5 space-y-4">
                {editAction === "CORRECT" && (
                  <ParkingAreaSelect id="correctedParkingArea" label="Corrected Parking Area" value={editParkingArea} areas={availableParkingAreas} onChange={setEditParkingArea} />
                )}
                <Input id="correctionReason" label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} required />
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" variant={editAction === "VOID" ? "danger" : "primary"} disabled={saving}>
                    {saving ? "Saving..." : editAction === "VOID" ? "Void Log" : "Save Correction"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEditingLog(null)}>Cancel</Button>
                </div>
              </div>
            </Card>
          </form>
        ) : null}

        {error && <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error}</div>}
        {success && <div className="rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}
      </div>
    </PageContainer>
  );
}

function ParkingAreaSelect({ id, label, value, areas, onChange }: { id: string; label: string; value: keyof Parking | ""; areas: Array<keyof Parking>; onChange: (value: keyof Parking | "") => void }) {
  return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label><select id={id} value={value} disabled={areas.length === 0} onChange={(event) => onChange(event.target.value as keyof Parking)} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm disabled:bg-slate-100"><option value="">Select parking area</option>{areas.map((area) => <option key={area} value={area}>{parkingAreaLabels[area]}</option>)}</select></div>;
}
