import { useEffect, useRef, useState, type FormEvent } from "react";
import { HiTruck, HiUser } from "react-icons/hi2";

import useAuth from "../../auth/hooks/useAuth";
import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Input from "../../../shared/components/Input";
import Select from "../../../shared/components/Select";
import Alert from "../../../shared/components/Alert";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import StatusBadge from "../../../shared/components/StatusBadge";
import {
  subscribeToBuilding,
  type ManagedBuilding,
} from "../../../services/buildingService";
import {
  deleteEmployeeVehicle,
  getEmployeeVehicles,
  registerEmployeeVehicle,
  type EmployeeVehicle,
  updateEmployeeVehicle,
} from "../../../services/employeeVehicleService";
import { PhysicalLayoutView, LayoutSelector, useLocationLayouts, useLayout, useSlotStatuses } from "../../parking";

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [building, setBuilding] = useState<ManagedBuilding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<EmployeeVehicle[]>([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<"CAR" | "BIKE">("CAR");
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<EmployeeVehicle | null>(null);
  const [selectedLayoutId, setSelectedLayoutId] = useState("");
  const editFormRef = useRef<HTMLDivElement | null>(null);

  // Get the Layouts for the employee's assigned location (building)
  const { layouts } = useLocationLayouts(user?.buildingId);
  const { layout } = useLayout(user?.buildingId, selectedLayoutId || undefined);
  const { getStatus } = useSlotStatuses(user?.buildingId, selectedLayoutId || undefined);

  // Default to the location's default layout once its layouts load
  useEffect(() => {
    if (layouts.length === 0) return;
    if (!layouts.some((l) => l.id === selectedLayoutId)) {
      setSelectedLayoutId(layouts[0].id);
    }
  }, [layouts, selectedLayoutId]);

  useEffect(() => {
    if (!user?.uid) return;

    void getEmployeeVehicles(user.uid)
      .then(setVehicles)
      .catch(() => setError("Unable to load registered vehicles."));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.buildingId) {
      setBuilding(null);
      return;
    }

    const unsubscribe = subscribeToBuilding(
      user.buildingId,
      (updatedBuilding) => {
        setBuilding(updatedBuilding ? { ...updatedBuilding, id: user.buildingId } : null);
      },
      () => {
        setError("Real-time availability updates are temporarily unavailable.");
      },
    );

    return unsubscribe;
  }, [user?.buildingId]);

  useEffect(() => {
    if (editingVehicle && editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingVehicle]);

  async function handleAddVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.uid) return;
    setVehicleFormError(null);

    try {
      await registerEmployeeVehicle(user.uid, vehicleNumber, vehicleType);
      setVehicleNumber("");
      setVehicleType("CAR");
      setVehicles(await getEmployeeVehicles(user.uid));
    } catch (vehicleError) {
      setVehicleFormError(vehicleError instanceof Error ? vehicleError.message : "Unable to register vehicle.");
    }
  }

  async function handleSaveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingVehicle || !user?.uid) return;
    setVehicleFormError(null);

    try {
      await updateEmployeeVehicle(editingVehicle.id, editingVehicle.registrationNumber, editingVehicle.vehicleType);
      setEditingVehicle(null);
      setVehicles(await getEmployeeVehicles(user.uid));
    } catch (vehicleError) {
      setVehicleFormError(vehicleError instanceof Error ? vehicleError.message : "Unable to update vehicle.");
    }
  }

  async function handleRemoveVehicle(vehicleId: string) {
    if (!user?.uid) return;
    if (!window.confirm("Remove this vehicle from your account?")) return;

    try {
      await deleteEmployeeVehicle(vehicleId);
      setVehicles(await getEmployeeVehicles(user.uid));
    } catch {
      setVehicleFormError("Unable to remove vehicle.");
    }
  }

  const assignedOfficeName = building ? `${building.name}, ${building.city}` : "Assigned office";

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-8 py-4">
        <PageHeader
          title="Employee Parking Portal"
          subtitle="View real-time availability for your assigned Temenos office and manage registered vehicles."
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* Main Column */}
          <div className="space-y-6">
            {/* Profile Section */}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-temenos-teal/10 text-temenos-teal">
                    <HiUser className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-temenos-navy">
                      {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Employee Profile"}
                    </h2>
                    <p className="text-xs text-slate-500">Corporate Parking Account</p>
                  </div>
                </div>
                <StatusBadge variant="info">{user?.role ?? "EMPLOYEE"}</StatusBadge>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <ProfileItem label="Employee ID" value={user?.employeeId || "Not assigned"} />
                <ProfileItem label="Email Address" value={user?.email || "Not set"} />
                <ProfileItem label="Assigned Branch" value={user?.buildingId ? assignedOfficeName : "Not assigned"} />
              </div>
            </Card>

            {/* Parking Layout */}
            {building && layouts.length > 0 ? (
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-temenos-teal">Parking Layout</span>
                    <h2 className="text-lg font-bold text-temenos-navy">{assignedOfficeName}</h2>
                  </div>
                  {layouts.length > 1 ? (
                    <LayoutSelector layouts={layouts} selectedLayoutId={selectedLayoutId} onChange={setSelectedLayoutId} />
                  ) : null}
                </div>
                <div className="mt-4">
                  <PhysicalLayoutView slots={layout?.slots ?? []} getSlotStatus={getStatus} />
                </div>
              </Card>
            ) : null}
          </div>

          {/* Right Column (Vehicles) */}
          <div className="space-y-6">
            {/* Vehicle Management */}
            <Card>
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-temenos-teal">Vehicle Management</span>
                <h2 className="text-lg font-bold text-temenos-navy">My Registered Vehicles</h2>
              </div>

              <div ref={editFormRef} className="mt-5">
                {editingVehicle ? (
                  <form className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleSaveVehicle}>
                    <p className="text-sm font-bold text-temenos-navy">Edit Vehicle Details</p>
                    <Input
                      id="editVehicleNumber"
                      label="Vehicle Registration Number"
                      value={editingVehicle.registrationNumber}
                      onChange={(event) => setEditingVehicle({ ...editingVehicle, registrationNumber: event.target.value })}
                      required
                    />
                    <Select
                      label="Vehicle Type"
                      value={editingVehicle.vehicleType}
                      onChange={(event) => setEditingVehicle({ ...editingVehicle, vehicleType: event.target.value as "CAR" | "BIKE" })}
                    >
                      <option value="CAR">Car</option>
                      <option value="BIKE">Bike</option>
                    </Select>
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" variant="primary" className="flex-1">Save Changes</Button>
                      <Button type="button" variant="secondary" onClick={() => setEditingVehicle(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleAddVehicle}>
                    <Input
                      id="employeeVehicleNumber"
                      label="Vehicle Registration Number"
                      placeholder="e.g. TN01AB1234"
                      value={vehicleNumber}
                      onChange={(event) => setVehicleNumber(event.target.value)}
                      required
                    />
                    <Select
                      label="Vehicle Type"
                      value={vehicleType}
                      onChange={(event) => setVehicleType(event.target.value as "CAR" | "BIKE")}
                    >
                      <option value="CAR">Car</option>
                      <option value="BIKE">Bike</option>
                    </Select>
                    <Button type="submit" variant="secondary" fullWidth>Add New Vehicle</Button>
                  </form>
                )}
              </div>

              {vehicleFormError ? (
                <Alert variant="error" className="mt-4 p-3 text-xs">
                  {vehicleFormError}
                </Alert>
              ) : null}

              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered List</p>
                {vehicles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
                    No vehicles registered yet. Add your vehicle above to register it.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <HiTruck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-temenos-navy">{vehicle.registrationNumber}</p>
                            <p className="text-xs font-medium text-slate-500">{vehicle.vehicleType}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Button variant="ghost" className="text-xs px-2.5 py-1" onClick={() => setEditingVehicle(vehicle)}>
                            Edit
                          </Button>
                          <Button variant="ghost" className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1" onClick={() => void handleRemoveVehicle(vehicle.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-temenos-navy truncate">{value}</dd>
    </div>
  );
}
