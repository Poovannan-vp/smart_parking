import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { HiPlusCircle } from "react-icons/hi2";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Input from "../../../shared/components/Input";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import StatusBadge from "../../../shared/components/StatusBadge";
import { createBuilding, getManagedBuildings, updateBuilding, type BuildingInput, type ManagedBuilding } from "../../../services/buildingService";

const parkingAreaLabels: Record<keyof BuildingInput["parking"], string> = {
  closedBike: "Closed Bike",
  closedCar: "Closed Car",
  openCar: "Open Car",
  general: "General",
};

const parkingAreaKeys = Object.keys(parkingAreaLabels) as Array<keyof BuildingInput["parking"]>;

const emptyBuilding: BuildingInput = {
  name: "",
  city: "",
  status: "Open",
  parking: {},
};

function toBuildingInput(building: ManagedBuilding): BuildingInput {
  return {
    name: building.name,
    city: building.city,
    status: building.status === "Closed" ? "Closed" : "Open",
    parking: building.parking,
  };
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<ManagedBuilding[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BuildingInput>(emptyBuilding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  const totals = useMemo(() => {
    return buildings.reduce(
      (summary, building) => {
        const areas = Object.values(building.parking).filter(Boolean);

        return {
          capacity: summary.capacity + areas.reduce((total, area) => total + area!.capacity, 0),
          occupied: summary.occupied + areas.reduce((total, area) => total + area!.occupied, 0),
          openBuildings: summary.openBuildings + (building.status === "Open" ? 1 : 0),
        };
      },
      { capacity: 0, occupied: 0, openBuildings: 0 },
    );
  }, [buildings]);

  async function loadBuildings() {
    setLoading(true);
    setError(null);

    try {
      setBuildings(await getManagedBuildings());
    } catch {
      setError("Unable to load building data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBuildings();
  }, []);

  function selectBuilding(building: ManagedBuilding) {
    setSelectedBuildingId(building.id);
    setDraft(toBuildingInput(building));
    setError(null);
    setSuccess(null);
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function startNewBuilding() {
    setSelectedBuildingId(null);
    setDraft(emptyBuilding);
    setShowForm(true);
    setError(null);
    setSuccess(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function closeForm() {
    setShowForm(false);
    setSelectedBuildingId(null);
    setDraft(emptyBuilding);
    setError(null);
    setSuccess(null);
  }

  function updateParkingArea(area: keyof BuildingInput["parking"], enabled: boolean, capacity?: number) {
    setDraft((current) => {
      const currentArea = current.parking[area];

      if (!enabled) {
        if (currentArea && currentArea.occupied > 0) {
          setError(`Cannot remove ${parkingAreaLabels[area]} while it has occupied vehicles.`);
          return current;
        }

        const remainingParking = { ...current.parking };
        delete remainingParking[area];
        return { ...current, parking: remainingParking };
      }

      return {
        ...current,
        parking: {
          ...current.parking,
          [area]: {
            capacity: capacity ?? currentArea?.capacity ?? 0,
            occupied: currentArea?.occupied ?? 0,
          },
        },
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!draft.name.trim() || !draft.city.trim()) {
      setError("Building name and city are required.");
      return;
    }

    const areas = Object.values(draft.parking).filter(Boolean);

    if (areas.length === 0) {
      setError("Configure at least one parking area.");
      return;
    }

    if (areas.some((area) => area!.capacity < area!.occupied)) {
      setError("A parking capacity cannot be lower than its current occupied count.");
      return;
    }

    setSaving(true);

    try {
      const buildingData: BuildingInput = {
        ...draft,
        name: draft.name.trim(),
        city: draft.city.trim(),
      };

      if (selectedBuildingId) {
        await updateBuilding(selectedBuildingId, buildingData);
        setSuccess("Building updated successfully.");
      } else {
        await createBuilding(buildingData);
        setSuccess("New building added successfully.");
      }

      await loadBuildings();
      setSelectedBuildingId(null);
      setShowForm(false);
    } catch {
      setError("Unable to save the building.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-7xl space-y-8 py-8">
        <PageHeader
          title="Buildings"
          subtitle="Manage parking buildings and capacity across the Smart Parking network."
          actions={
            <Button variant="secondary" onClick={startNewBuilding}>
              <span className="inline-flex items-center gap-2">
                <HiPlusCircle className="h-5 w-5" /> New Building
              </span>
            </Button>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Buildings</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{buildings.length}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Open Buildings</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{totals.openBuildings}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Total capacity</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{totals.capacity}</p>
              </Card>
              <Card className="p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Available slots</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{totals.capacity - totals.occupied}</p>
              </Card>
            </div>

            <Card>
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Building inventory</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">Manage buildings</p>
                </div>
                <Button variant="secondary" onClick={startNewBuilding}>Add building</Button>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">Loading buildings…</p>
              ) : buildings.length === 0 ? (
                <p className="text-sm text-slate-500">No buildings found. Add your first building.</p>
              ) : (
                <ul className="space-y-3">
                  {buildings.map((building) => (
                    <li key={building.id}>
                      <button
                        type="button"
                        onClick={() => selectBuilding(building)}
                        className={`w-full rounded-3xl border p-4 text-left transition ${
                          selectedBuildingId === building.id
                            ? "border-slate-900 bg-slate-950 text-white"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold">{building.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{building.city}</p>
                          </div>
                          <StatusBadge variant={building.status === "Open" ? "success" : "danger"}>
                            {building.status}
                          </StatusBadge>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {showForm ? (
            <div ref={formRef} className="space-y-6">
              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      {selectedBuildingId ? "Edit building" : "New building"}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      {selectedBuildingId ? "Update building details" : "Create new building"}
                    </h2>
                  </div>
                  <Button variant="ghost" onClick={closeForm} className="text-slate-600 hover:text-slate-900">Cancel</Button>
                </div>

                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="buildingName"
                      label="Building Name"
                      value={draft.name}
                      onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                      required
                    />
                    <Input
                      id="city"
                      label="City"
                      value={draft.city}
                      onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="buildingStatus" className="text-sm font-semibold text-slate-800">Status</label>
                    <select
                      id="buildingStatus"
                      value={draft.status}
                      onChange={(event) => setDraft((current) => ({
                        ...current,
                        status: event.target.value as BuildingInput["status"],
                      }))}
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-slate-800">Parking areas</legend>
                    {parkingAreaKeys.map((area) => {
                      const parking = draft.parking[area];

                      return (
                        <div key={area} className="grid grid-cols-[auto_minmax(0,1fr)_7rem] items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <input
                            id={`enabled-${area}`}
                            type="checkbox"
                            checked={Boolean(parking)}
                            onChange={(event) => updateParkingArea(area, event.target.checked)}
                            className="h-4 w-4 accent-slate-900"
                          />
                          <label htmlFor={`enabled-${area}`} className="text-sm font-medium text-slate-700">
                            {parkingAreaLabels[area]}
                          </label>
                          <input
                            type="number"
                            min="0"
                            aria-label={`${parkingAreaLabels[area]} capacity`}
                            value={parking?.capacity ?? ""}
                            disabled={!parking}
                            onChange={(event) => updateParkingArea(area, true, Number(event.target.value))}
                            placeholder="Capacity"
                            className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100"
                          />
                        </div>
                      );
                    })}
                  </fieldset>

                  {error && <p className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error}</p>}
                  {success && <p className="rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</p>}

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" onClick={closeForm} className="w-full sm:w-auto">Cancel</Button>
                    <Button fullWidth type="submit" disabled={saving} className="w-full sm:w-auto">
                      {saving ? "Saving…" : selectedBuildingId ? "Save building" : "Create building"}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
