import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import BuildingSelector from "../../home/components/BuildingSelector";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import PageContainer from "../../../shared/components/PageContainer";
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
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Vehicle Log</h1>
            {!isDeveloper && <p className="mt-1 text-sm text-slate-500">Assigned building: {activeBuildingName ?? "Loading..."}</p>}
          </div>
          <Button variant="secondary" onClick={() => navigate("/security")}>Back</Button>
        </div>

        {isDeveloper && <BuildingSelector buildings={buildings} selectedBuilding={selectedBuilding} onChange={setSelectedBuilding} />}
        {!isDeveloper && !activeBuildingId && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Your account has no assigned building. Ask an Admin to assign one.</p>}

        <form className="space-y-4 rounded-xl bg-white p-5 shadow" onSubmit={handleCreate}>
          <h2 className="text-lg font-semibold">New Gate Entry</h2>
          <Input id="vehicleNumber" label="Vehicle Number" placeholder="TN01AB1234" value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} onBlur={() => setVehicleNumber((value) => normalizeVehicleNumber(value))} required />
          <ParkingAreaSelect id="parkingArea" label="Parking Area" value={parkingArea} areas={availableParkingAreas} onChange={setParkingArea} />
          <Button fullWidth type="submit" disabled={saving || !activeBuildingId}>{saving ? "Saving..." : "Log Vehicle"}</Button>
        </form>

        <section className="rounded-xl bg-white p-5 shadow">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h2 className="text-lg font-semibold">Vehicle History</h2><p className="mt-1 text-sm text-slate-500">Search or select any date for this building.</p></div>
            <label className="text-sm font-medium text-slate-700">Date<input type="date" value={logDate} max={getVehicleLogDate()} onChange={(event) => setLogDate(event.target.value)} className="ml-2 h-10 rounded-lg border border-slate-300 px-3 text-sm" /></label>
          </div>
          <div className="mt-4"><Input id="vehicleSearch" label="Search Vehicle Number" placeholder="TN01AB1234" value={search} onChange={(event) => setSearch(event.target.value)} /></div>

          {loading ? <p className="mt-4 text-sm text-slate-500">Loading vehicle log...</p> : filteredLogs.length === 0 ? <p className="mt-4 text-sm text-slate-500">No matching vehicle logs.</p> : (
            <ul className="mt-4 space-y-3">
              {filteredLogs.map((log) => (
                <li key={log.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-semibold text-slate-800">{log.vehicleNumber}</p><p className="text-sm text-slate-500">{log.parkingArea ? parkingAreaLabels[log.parkingArea] : "Parking area not selected"} · {formatLoggedAt(log.loggedAt)}</p></div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${log.status === "VOID" ? "bg-slate-200 text-slate-700" : log.status === "EXITED" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{log.status ?? "ACTIVE"}</span>
                  </div>
                  {(log.status ?? "ACTIVE") === "ACTIVE" && <div className="mt-3 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => void handleExit(log)} disabled={saving}>Mark Exit</Button><Button variant="secondary" onClick={() => beginEdit(log, "CORRECT")}>Correct</Button><Button variant="danger" onClick={() => beginEdit(log, "VOID")}>Void</Button></div>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {editingLog && <form className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5" onSubmit={handleCorrection}>
          <div><h2 className="text-lg font-semibold">{editAction === "VOID" ? "Void" : "Correct"} {editingLog.vehicleNumber}</h2><p className="mt-1 text-sm text-slate-600">A reason is required and saved in the audit trail.</p></div>
          {editAction === "CORRECT" && <ParkingAreaSelect id="correctedParkingArea" label="Corrected Parking Area" value={editParkingArea} areas={availableParkingAreas} onChange={setEditParkingArea} />}
          <Input id="correctionReason" label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} required />
          <div className="flex gap-3"><Button type="submit" variant={editAction === "VOID" ? "danger" : "primary"} disabled={saving}>{saving ? "Saving..." : editAction === "VOID" ? "Void Log" : "Save Correction"}</Button><Button type="button" variant="secondary" onClick={() => setEditingLog(null)}>Cancel</Button></div>
        </form>}

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {success && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}
      </div>
    </PageContainer>
  );
}

function ParkingAreaSelect({ id, label, value, areas, onChange }: { id: string; label: string; value: keyof Parking | ""; areas: Array<keyof Parking>; onChange: (value: keyof Parking | "") => void }) {
  return <div className="space-y-2"><label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label><select id={id} value={value} disabled={areas.length === 0} onChange={(event) => onChange(event.target.value as keyof Parking)} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm disabled:bg-slate-100"><option value="">Select parking area</option>{areas.map((area) => <option key={area} value={area}>{parkingAreaLabels[area]}</option>)}</select></div>;
}
