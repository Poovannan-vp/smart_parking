import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { HiTruck, HiUser, HiBuildingOffice, HiCheckCircle } from "react-icons/hi2";

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
  if (key.startsWith("open")) return "Open Parking Area";
  if (key.startsWith("closed")) return "Closed / Covered Parking";
  return "General Parking Area";
}

function getAreaLabel(key: string) {
  return areaLabels[key as ParkingAreaKey] ?? key.replace(/([A-Z])/g, " $1").trim();
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
        key: key as ParkingAreaKey,
        section: getSectionLabel(key),
        label: getAreaLabel(key),
        capacity: area!.capacity,
        occupied: area!.occupied,
        available: area!.capacity - area!.occupied,
      }));
  }, [building]);

  const availableParkingAreas = parkingAreas.filter((area) => area.available > 0);

  // Group parking areas by category (Car vs Bike vs General)
  const carAreas = parkingAreas.filter((area) => area.key === "closedCar" || area.key === "openCar");
  const bikeAreas = parkingAreas.filter((area) => area.key === "closedBike");
  const generalAreas = parkingAreas.filter((area) => area.key === "general");

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
      <div className="mx-auto max-w-6xl space-y-8 py-4">
        <PageHeader
          title="Employee Parking Portal"
          subtitle="View real-time availability for your assigned Temenos office, book daily slots, and manage registered vehicles."
        />

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* Main Column */}
          <div className="space-y-6">
            {/* Profile Section */}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00A3E0]/10 text-[#00A3E0]">
                    <HiUser className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0F2042]">
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

            {/* Office Parking Availability */}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#00A3E0]">Branch Overview</span>
                  <h2 className="text-lg font-bold text-[#0F2042]">{assignedOfficeName}</h2>
                </div>
                {building ? (
                  <StatusBadge variant={building.status === "Open" ? "success" : "danger"}>
                    {building.status === "Open" ? "Operational" : "Closed"}
                  </StatusBadge>
                ) : null}
              </div>

              {loading ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading assigned office availability...</div>
              ) : !user?.buildingId ? (
                <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50 p-6 text-center text-sm text-slate-600">
                  <HiBuildingOffice className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  Please ask your system administrator to assign an office to your user profile to view live parking availability.
                </div>
              ) : !building ? (
                <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50 p-6 text-center text-sm text-slate-600">
                  Assigned office details are currently unavailable.
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {/* Car Parking Category */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#00A3E0]"></span>
                      Car Parking
                    </h3>
                    {carAreas.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {carAreas.map((area) => (
                          <ParkingCategoryCard key={area.key} area={area} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
                        Car parking information will be available once updated.
                      </div>
                    )}
                  </div>

                  {/* Bike Parking Category */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Bike Parking
                    </h3>
                    {bikeAreas.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {bikeAreas.map((area) => (
                          <ParkingCategoryCard key={area.key} area={area} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
                        Bike parking information will be available once updated.
                      </div>
                    )}
                  </div>

                  {/* General Category if configured */}
                  {generalAreas.length > 0 ? (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">General Parking</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {generalAreas.map((area) => (
                          <ParkingCategoryCard key={area.key} area={area} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column (Booking & Vehicles) */}
          <div className="space-y-6">
            {/* Book Parking Slot */}
            <Card>
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#00A3E0]">Daily Access</span>
                <h2 className="text-lg font-bold text-[#0F2042]">Book Parking Slot</h2>
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleBookParking}>
                <div className="space-y-1.5">
                  <label htmlFor="parkingArea" className="block text-sm font-semibold text-slate-800">
                    Parking Area
                  </label>
                  <select
                    id="parkingArea"
                    value={selectedParkingArea}
                    onChange={(event) => setSelectedParkingArea(event.target.value as ParkingAreaKey | "")}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#00A3E0] focus:ring-2 focus:ring-[#00A3E0]/20"
                  >
                    <option value="">Select an available area</option>
                    {availableParkingAreas.map((area) => (
                      <option key={area.key} value={area.key}>
                        {`${area.section} (${area.label}) — ${area.available} free`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="vehicleSelect" className="block text-sm font-semibold text-slate-800">
                    Registered Vehicle
                  </label>
                  <select
                    id="vehicleSelect"
                    value={selectedVehicleId}
                    onChange={(event) => setSelectedVehicleId(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#00A3E0] focus:ring-2 focus:ring-[#00A3E0]/20"
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {`${vehicle.registrationNumber} (${vehicle.vehicleType})`}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={!building || availableParkingAreas.length === 0 || vehicles.length === 0}
                  className="py-3"
                >
                  Book Slot Now
                </Button>

                {bookingMessage ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 flex items-center gap-2">
                    <HiCheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    {bookingMessage}
                  </div>
                ) : null}
              </form>
            </Card>

            {/* Vehicle Management */}
            <Card>
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#00A3E0]">Vehicle Management</span>
                <h2 className="text-lg font-bold text-[#0F2042]">My Registered Vehicles</h2>
              </div>

              <div ref={editFormRef} className="mt-5">
                {editingVehicle ? (
                  <form className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleSaveVehicle}>
                    <p className="text-sm font-bold text-[#0F2042]">Edit Vehicle Details</p>
                    <Input
                      id="editVehicleNumber"
                      label="Vehicle Registration Number"
                      value={editingVehicle.registrationNumber}
                      onChange={(event) => setEditingVehicle({ ...editingVehicle, registrationNumber: event.target.value })}
                      required
                    />
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-slate-800">Vehicle Type</label>
                      <select
                        value={editingVehicle.vehicleType}
                        onChange={(event) => setEditingVehicle({ ...editingVehicle, vehicleType: event.target.value as "CAR" | "BIKE" })}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#00A3E0] focus:ring-2 focus:ring-[#00A3E0]/20"
                      >
                        <option value="CAR">Car</option>
                        <option value="BIKE">Bike</option>
                      </select>
                    </div>
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
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-slate-800">Vehicle Type</label>
                      <select
                        value={vehicleType}
                        onChange={(event) => setVehicleType(event.target.value as "CAR" | "BIKE")}
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#00A3E0] focus:ring-2 focus:ring-[#00A3E0]/20"
                      >
                        <option value="CAR">Car</option>
                        <option value="BIKE">Bike</option>
                      </select>
                    </div>
                    <Button type="submit" variant="secondary" fullWidth>Add New Vehicle</Button>
                  </form>
                )}
              </div>

              {vehicleFormError ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  {vehicleFormError}
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered List</p>
                {vehicles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
                    No vehicles registered yet. Add your vehicle above to book parking slots.
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
                            <p className="text-sm font-bold text-[#0F2042]">{vehicle.registrationNumber}</p>
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
      <dd className="mt-1 text-sm font-bold text-[#0F2042] truncate">{value}</dd>
    </div>
  );
}

function ParkingCategoryCard({ area }: { area: { key: ParkingAreaKey; section: string; label: string; capacity: number; occupied: number; available: number } }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-sm font-bold text-[#0F2042]">{area.label}</span>
          <p className="text-xs text-slate-500">{area.section}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${area.available > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {area.available} free
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100">
        <div>
          <span className="text-slate-400">Total</span>
          <p className="font-bold text-slate-800">{area.capacity}</p>
        </div>
        <div>
          <span className="text-slate-400">Occupied</span>
          <p className="font-bold text-slate-800">{area.occupied}</p>
        </div>
        <div>
          <span className="text-slate-400">Available</span>
          <p className="font-bold text-emerald-600">{area.available}</p>
        </div>
      </div>
    </div>
  );
}



