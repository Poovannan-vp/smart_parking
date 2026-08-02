import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import useAuth from "../../auth/hooks/useAuth";
import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Input from "../../../shared/components/Input";
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
import { createVehicleLog } from "../../../services/vehicleLogService";

type ParkingAreaKey = "closedBike" | "closedCar" | "openCar" | "general";

const areaLabels: Record<ParkingAreaKey, string> = {
  closedBike: "Bike",
  closedCar: "Car",
  openCar: "Car",
  general: "General",
};

function getSectionLabel(key: string) {
  if (key.startsWith("open")) return "Open Parking";
  if (key.startsWith("closed")) return "Closed Parking";
  return "General Parking";
}

function getAreaLabel(key: string) {
  return areaLabels[key] ?? key.replace(/([A-Z])/g, " $1").trim();
}

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [building, setBuilding] = useState<ManagedBuilding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<EmployeeVehicle[]>([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<"CAR" | "BIKE">("CAR");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedParkingArea, setSelectedParkingArea] = useState<ParkingAreaKey | "">("closedBike");
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<EmployeeVehicle | null>(null);
  const editFormRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    void getEmployeeVehicles(user.uid)
      .then(setVehicles)
      .catch(() => setError("Unable to load registered vehicles."));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.buildingId) {
      setBuilding(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToBuilding(
      user.buildingId,
      (updatedBuilding) => {
        if (updatedBuilding) {
          setBuilding({ ...updatedBuilding, id: user.buildingId });
        } else {
          setBuilding(null);
        }
        setLoading(false);
      },
      () => {
        setError("Real-time availability updates are temporarily unavailable.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.buildingId]);

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  useEffect(() => {
    if (editingVehicle && editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingVehicle]);

  const parkingAreas = useMemo(() => {
    if (!building) return [];

    return (Object.entries(building.parking) as Array<[string, { capacity: number; occupied: number } | undefined]>)
      .filter(([, area]) => Boolean(area))
      .map(([key, area]) => ({
        key,
        section: getSectionLabel(key),
        label: getAreaLabel(key),
        capacity: area!.capacity,
        occupied: area!.occupied,
        available: area!.capacity - area!.occupied,
      }));
  }, [building]);

  const availableParkingAreas = parkingAreas.filter((area) => area.available > 0);

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
    if (!editingVehicle) return;
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
      if (selectedVehicleId === vehicleId) {
        setSelectedVehicleId(vehicles[0]?.id ?? "");
      }
    } catch {
      setVehicleFormError("Unable to remove vehicle.");
    }
  }

  async function handleBookParking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingMessage(null);

    if (!user?.buildingId) {
      setBookingMessage("No assigned office is available for booking.");
      return;
    }
    if (!selectedParkingArea) {
      setBookingMessage("Select an available parking area.");
      return;
    }
    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
    if (!selectedVehicle) {
      setBookingMessage("Select a registered vehicle first.");
      return;
    }

    try {
      await createVehicleLog({
        buildingId: user.buildingId,
        vehicleNumber: selectedVehicle.registrationNumber,
        parkingArea: selectedParkingArea as keyof typeof areaLabels,
      });
      setBookingMessage("Parking slot booked successfully for today.");
    } catch (bookingError) {
      setBookingMessage(bookingError instanceof Error ? bookingError.message : "Unable to book parking.");
    }
  }

  const assignedOfficeName = building ? `${building.name}, ${building.city}` : "Assigned office";

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-8 py-8">
        <PageHeader
          title="Employee Dashboard"
          subtitle="View your assigned office and manage parking in a clean, simple experience."
        />

        {error ? (
          <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
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
                <ProfileItem label="Assigned Office" value={user?.buildingId ? assignedOfficeName : "Not assigned"} />
              </div>
            </Card>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Office parking</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{assignedOfficeName}</p>
                </div>
                {building ? (
                  <StatusBadge variant={building.status === "Open" ? "success" : "danger"}>{building.status}</StatusBadge>
                ) : null}
              </div>

              {loading ? (
                <div className="mt-6 text-sm text-slate-600">Loading assigned office availability...</div>
              ) : !user?.buildingId ? (
                <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">Ask your administrator to assign your office to your account so you can view parking availability.</div>
              ) : !building ? (
                <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">Assigned office details are not currently available.</div>
              ) : parkingAreas.length === 0 ? (
                <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-sm text-slate-600">No parking data is available for this office.</div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {parkingAreas.map((area) => (
                    <div key={area.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{area.label}</p>
                          <p className="mt-1 text-sm text-slate-500">{area.section}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                          {area.available} free
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3 text-sm text-slate-600">
                        <div>Capacity: {area.capacity}</div>
                        <div>Occupied: {area.occupied}</div>
                        <div>Available: {area.available}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Book parking slot</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Select your area and vehicle</p>
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleBookParking}>
                <div>
                  <label htmlFor="parkingArea" className="text-sm font-medium text-slate-700">Parking area</label>
                  <select
                    id="parkingArea"
                    value={selectedParkingArea}
                    onChange={(event) => setSelectedParkingArea(event.target.value as ParkingAreaKey | "")}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">Select an available area</option>
                    {availableParkingAreas.map((area) => (
                      <option key={area.key} value={area.key}>{`${area.section} / ${area.label} — ${area.available} available`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="vehicleSelect" className="text-sm font-medium text-slate-700">Registered vehicle</label>
                  <select
                    id="vehicleSelect"
                    value={selectedVehicleId}
                    onChange={(event) => setSelectedVehicleId(event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>{`${vehicle.registrationNumber} (${vehicle.vehicleType})`}</option>
                    ))}
                  </select>
                </div>

                <Button type="submit" fullWidth disabled={!building || availableParkingAreas.length === 0 || vehicles.length === 0}>Book parking slot</Button>

                {bookingMessage ? (
                  <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">{bookingMessage}</div>
                ) : null}
              </form>
            </Card>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Registered vehicles</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Add, edit, or remove your vehicles</p>
                </div>
              </div>

              <div ref={editFormRef}>
                {editingVehicle ? (
                  <form className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5" onSubmit={handleSaveVehicle}>
                    <p className="text-sm font-semibold text-slate-900">Edit vehicle</p>
                    <Input
                      id="editVehicleNumber"
                      label="Vehicle Number"
                      value={editingVehicle.registrationNumber}
                      onChange={(event) => setEditingVehicle({ ...editingVehicle, registrationNumber: event.target.value })}
                      required
                    />
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-800">Vehicle Type</span>
                      <select
                        value={editingVehicle.vehicleType}
                        onChange={(event) => setEditingVehicle({ ...editingVehicle, vehicleType: event.target.value as "CAR" | "BIKE" })}
                        className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="CAR">Car</option>
                        <option value="BIKE">Bike</option>
                      </select>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit">Save changes</Button>
                      <Button type="button" variant="secondary" onClick={() => setEditingVehicle(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <form className="mt-6 grid gap-4" onSubmit={handleAddVehicle}>
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
                    <Button type="submit" fullWidth>Add Vehicle</Button>
                  </form>
                )}
              </div>

              {vehicleFormError ? (
                <div className="mt-4 rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">{vehicleFormError}</div>
              ) : null}

              <div className="mt-6 space-y-3">
                {vehicles.length === 0 ? (
                  <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">No vehicles registered yet.</div>
                ) : (
                  <ul className="space-y-3">
                    {vehicles.map((vehicle) => (
                      <li key={vehicle.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">{vehicle.registrationNumber}</p>
                            <p className="text-sm text-slate-500">{vehicle.vehicleType}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => setEditingVehicle(vehicle)}>Edit</Button>
                            <Button variant="danger" onClick={() => void handleRemoveVehicle(vehicle.id)}>Remove</Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
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
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-800">{value}</dd>
    </div>
  );
}


