import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "../../../app/routes";
import useAuth from "../../auth/hooks/useAuth";
import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Input from "../../../shared/components/Input";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import StatusBadge from "../../../shared/components/StatusBadge";
import EmptyState from "../../../shared/components/EmptyState";
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
      <div className="mx-auto max-w-6xl space-y-8 py-8">
        <PageHeader
          title="Employee Dashboard"
          subtitle="Track your assigned building, parking availability, and registered vehicles in one place."
          actions={
            <Button variant="secondary" onClick={() => navigate(ROUTES.HOME)}>
              Public Availability
            </Button>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">My Profile</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Employee"}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Role</p>
                  <StatusBadge>{user?.role ?? "EMPLOYEE"}</StatusBadge>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <ProfileItem label="Employee ID" value={user?.employeeId || "Not set"} />
                <ProfileItem label="Email" value={user?.email || "Not set"} />
                <ProfileItem label="Assigned Building" value={user?.buildingId || "Not assigned"} />
              </div>
            </Card>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">My Vehicles</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Registered vehicles</p>
                </div>
                <p className="text-sm text-slate-500">Add or manage vehicles quickly.</p>
              </div>

              <form onSubmit={addVehicle} className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_160px]">
                <Input
                  id="employeeVehicleNumber"
                  label="Vehicle Number"
                  placeholder="TN01AB1234"
                  value={vehicleNumber}
                  onChange={(event) => setVehicleNumber(event.target.value)}
                  required
                />
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">Vehicle Type</span>
                  <select
                    value={vehicleType}
                    onChange={(event) => setVehicleType(event.target.value as "CAR" | "BIKE")}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="CAR">Car</option>
                    <option value="BIKE">Bike</option>
                  </select>
                </label>
                <Button type="submit" fullWidth>Register Vehicle</Button>
              </form>

              <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                {vehicles.length > 0 ? (
                  <p>{vehicles.map((vehicle) => `${vehicle.registrationNumber} (${vehicle.vehicleType})`).join(" · ")}</p>
                ) : (
                  <p>No personal vehicles registered.</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Recommended building</p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">{recommendedBuilding ? recommendedBuilding.name : "No recommendation"}</p>
                  <p className="mt-2 text-sm text-slate-500">{recommendedBuilding ? `${recommendedBuilding.name} has the best available capacity right now.` : "Check live availability for the best option."}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Parking guidance</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>• Use open capacity buildings when possible.</li>
                    <li>• Follow Security guidance at the gate.</li>
                    <li>• Report any occupancy mismatch.</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Live Building Availability</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">All company buildings</p>
                </div>
                <Input
                  id="buildingSearch"
                  label="Search buildings"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Building or city"
                />
              </div>

              {error ? (
                <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error}</div>
              ) : null}

              {loading ? (
                <EmptyState title="Loading buildings" description="Fetching the latest availability data." />
              ) : visibleBuildings.length === 0 ? (
                <EmptyState title="No buildings found" description="Try changing your search criteria." />
              ) : (
                <div className="mt-6 grid gap-4">
                  {visibleBuildings.map((building) => (
                    <Card key={building.id} flat>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{building.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{building.city}</p>
                        </div>
                        <StatusBadge variant={building.status === "Open" ? "success" : "danger"}>{building.status}</StatusBadge>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-slate-600">
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{Object.values(building.parking).reduce((sum, area) => sum + (area ? area.capacity : 0), 0)}</p>
                          <p>Capacity</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{Object.values(building.parking).reduce((sum, area) => sum + (area ? area.occupied : 0), 0)}</p>
                          <p>Occupied</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-slate-900">{Object.values(building.parking).reduce((sum, area) => sum + (area ? area.capacity - area.occupied : 0), 0)}</p>
                          <p>Available</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setFavorite(building.id)} className="mt-4 text-sm font-medium text-slate-700 hover:text-slate-900">
                        {favoriteBuildingId === building.id ? "★ Favourite Building" : "☆ Set as Favourite"}
                      </button>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-800">{value}</dd></div>;
}


