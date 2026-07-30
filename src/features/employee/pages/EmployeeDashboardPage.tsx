import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "../../../app/routes";
import useAuth from "../../auth/hooks/useAuth";
import Button from "../../../shared/components/Button";
import PageContainer from "../../../shared/components/PageContainer";
import {
  getManagedBuildings,
  subscribeToBuilding,
  type ManagedBuilding,
} from "../../../services/buildingService";
import { getEmployeeVehicles, registerEmployeeVehicle, type EmployeeVehicle } from "../../../services/employeeVehicleService";

export default function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<ManagedBuilding[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteBuildingId, setFavoriteBuildingId] = useState(() => localStorage.getItem("favoriteBuildingId") ?? "");
  const [vehicles, setVehicles] = useState<EmployeeVehicle[]>([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<"CAR" | "BIKE">("CAR");

  useEffect(() => {
    async function loadBuildings() {
      try {
        setBuildings(await getManagedBuildings());
      } catch {
        setError("Unable to load building availability.");
      } finally {
        setLoading(false);
      }
    }

    void loadBuildings();
  }, []);

  useEffect(() => { if (user?.uid) void getEmployeeVehicles(user.uid).then(setVehicles).catch(() => setError("Unable to load registered vehicles.")); }, [user?.uid]);

  async function addVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    try { await registerEmployeeVehicle(user.uid, vehicleNumber, vehicleType); setVehicleNumber(""); setVehicles(await getEmployeeVehicles(user.uid)); } catch (vehicleError) { setError(vehicleError instanceof Error ? vehicleError.message : "Unable to register vehicle."); }
  }

  const buildingIdKey = buildings.map((building) => building.id).join("|");

  useEffect(() => {
    if (!buildingIdKey) return;

    const unsubscribe = buildings.map((building) => subscribeToBuilding(
      building.id,
      (updatedBuilding) => {
        if (!updatedBuilding) return;

        setBuildings((currentBuildings) => currentBuildings.map((currentBuilding) => (
          currentBuilding.id === building.id
            ? { ...updatedBuilding, id: building.id }
            : currentBuilding
        )));
      },
      () => setError("Real-time availability updates are temporarily unavailable."),
    ));

    return () => unsubscribe.forEach((stop) => stop());
  }, [buildingIdKey]);

  const visibleBuildings = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return buildings;

    return buildings.filter((building) => (
      building.name.toLowerCase().includes(term) || building.city.toLowerCase().includes(term)
    ));
  }, [buildings, search]);

  const recommendedBuilding = useMemo(() => buildings.reduce<ManagedBuilding | null>((best, building) => {
    const available = Object.values(building.parking).reduce((total, area) => total + (area ? area.capacity - area.occupied : 0), 0);
    const bestAvailable = best ? Object.values(best.parking).reduce((total, area) => total + (area ? area.capacity - area.occupied : 0), 0) : -1;
    return building.status === "Open" && available > bestAvailable ? building : best;
  }, null), [buildings]);

  function setFavorite(buildingId: string) {
    setFavoriteBuildingId(buildingId);
    localStorage.setItem("favoriteBuildingId", buildingId);
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-5xl space-y-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Employee Dashboard</h1>
            <p className="mt-1 text-slate-500">View live parking availability across every company building.</p>
          </div>
          <Button variant="secondary" onClick={() => navigate(ROUTES.HOME)}>Public Availability</Button>
        </div>

        <section className="rounded-xl bg-white p-5 shadow">
          <h2 className="text-lg font-semibold">My Profile</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <ProfileItem label="Name" value={[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Not set"} />
            <ProfileItem label="Employee ID" value={user?.employeeId || "Not set"} />
            <ProfileItem label="Email" value={user?.email || "Not set"} />
          </dl>
        </section>

        <section className="rounded-xl bg-white p-5 shadow"><h2 className="text-lg font-semibold">My Vehicles</h2><form onSubmit={addVehicle} className="mt-4 flex flex-wrap gap-3"><input value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} placeholder="TN01AB1234" className="h-10 rounded-lg border px-3" required /><select value={vehicleType} onChange={(event) => setVehicleType(event.target.value as "CAR" | "BIKE")} className="h-10 rounded-lg border px-3"><option value="CAR">Car</option><option value="BIKE">Bike</option></select><Button type="submit">Register Vehicle</Button></form><p className="mt-3 text-sm text-slate-500">{vehicles.length ? vehicles.map((vehicle) => `${vehicle.registrationNumber} (${vehicle.vehicleType})`).join(" · ") : "No personal vehicles registered."}</p></section>

        <section className="grid gap-4 rounded-xl border border-blue-200 bg-blue-50 p-5 md:grid-cols-2"><div><h2 className="font-semibold text-blue-950">Parking Guidance</h2><p className="mt-1 text-sm text-blue-800">{recommendedBuilding ? `${recommendedBuilding.name} currently has the best available capacity.` : "Check building availability before leaving."}</p></div><div><h2 className="font-semibold text-blue-950">Parking Rules</h2><p className="mt-1 text-sm text-blue-800">Use marked areas only, follow Security instructions, and report any incorrect occupancy at the gate.</p></div></section>

        <section className="rounded-xl bg-white p-5 shadow">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Live Building Availability</h2>
              <p className="mt-1 text-sm text-slate-500">This view is not restricted to an assigned building.</p>
            </div>
            <label className="text-sm font-medium text-slate-700">
              Search buildings
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Building or city"
                className="ml-2 h-10 rounded-lg border border-slate-300 px-3 text-sm"
              />
            </label>
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          {loading ? <p className="mt-4 text-sm text-slate-500">Loading buildings...</p> : visibleBuildings.length === 0 ? <p className="mt-4 text-sm text-slate-500">No buildings found.</p> : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {visibleBuildings.map((building) => <BuildingAvailabilityCard key={building.id} building={building} favorite={favoriteBuildingId === building.id} onFavorite={() => setFavorite(building.id)} />)}
            </div>
          )}
        </section>
      </div>
    </PageContainer>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-800">{value}</dd></div>;
}

function BuildingAvailabilityCard({ building, favorite, onFavorite }: { building: ManagedBuilding; favorite: boolean; onFavorite: () => void }) {
  const areas = Object.entries(building.parking).filter(([, area]) => Boolean(area));
  const capacity = areas.reduce((total, [, area]) => total + area!.capacity, 0);
  const occupied = areas.reduce((total, [, area]) => total + area!.occupied, 0);

  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-semibold text-slate-900">{building.name}</h3><p className="text-sm text-slate-500">{building.city}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${building.status === "Open" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{building.status}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Metric label="Capacity" value={capacity} tone="text-blue-600" />
        <Metric label="Occupied" value={occupied} tone="text-red-600" />
        <Metric label="Available" value={capacity - occupied} tone="text-green-600" />
      </div>
      <button type="button" onClick={onFavorite} className="mt-4 text-sm font-medium text-blue-700">{favorite ? "★ Favourite Building" : "☆ Set as Favourite"}</button>
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div><p className={`text-xl font-bold ${tone}`}>{value}</p><p className="text-xs text-slate-500">{label}</p></div>;
}
