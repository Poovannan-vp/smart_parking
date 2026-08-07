import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiMapPin, HiBuildingOffice2 } from "react-icons/hi2";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import EmptyState from "../../../shared/components/EmptyState";
import Header from "../../../shared/components/Header";
import LoadingState from "../../../shared/components/LoadingState";
import PageContainer from "../../../shared/components/PageContainer";
import StatusBadge from "../../../shared/components/StatusBadge";
import { ROUTES } from "../../../app/routes";

import {
  getManagedBuildings,
  type ManagedBuilding,
} from "../../../services/buildingService";

const googleMapsDestinations: Record<string, string> = {
  "Chennai KG": "Temenos Chennai KG office, Chennai",
  "Chennai SR": "Temenos Nungambakkam office, Chennai",
  Bangalore: "Temenos Bangalore office, Bangalore",
  Hyderabad: "Temenos Hyderabad office, Hyderabad",
};

function getGoogleMapsUrl(building: ManagedBuilding) {
  const destination = googleMapsDestinations[building.name] ?? `${building.name}, ${building.city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
}

function getAvailabilityStatus(available: number, capacity: number) {
  if (available === 0) return "Full";
  if (available <= Math.ceil(capacity * 0.1)) return "Almost Full";
  if (available <= Math.ceil(capacity * 0.3)) return "Busy";
  return "Available";
}

const officeParkingLabels: Record<string, string> = {
  closedBike: "Closed Bike",
  closedCar: "Closed Car",
  openCar: "Open Car",
};

function getBranchParkingAreas(building: ManagedBuilding) {
  const usesOfficeParking = building.name === "Chennai KG" || building.name === "Chennai SR";

  if (usesOfficeParking) {
    return Object.entries(building.parking)
      .filter(([key]) => key in officeParkingLabels)
      .map(([key, area]) => ({
        key,
        label: officeParkingLabels[key],
        capacity: area?.capacity ?? 0,
        occupied: area?.occupied ?? 0,
      }))
      .filter((area) => area.capacity > 0 || area.occupied > 0);
  }

  const generalArea = building.parking.general;
  return generalArea ? [{ key: "general", label: "General Parking", capacity: generalArea.capacity, occupied: generalArea.occupied }] : [];
}

function getParkingStatus(building: ManagedBuilding) {
  const areas = getBranchParkingAreas(building);
  return areas.length > 0 ? "Open" : "Closed";
}

function getAvailabilityBadge(available: number, capacity: number) {
  const status = getAvailabilityStatus(available, capacity);
  switch (status) {
    case "Full":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    case "Almost Full":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "Busy":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    default:
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
}

function formatUpdatedAt(value: unknown) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const parsed = new Date(String(value));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return null;
}

export default function HomePage() {
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState<ManagedBuilding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        setBuildings(await getManagedBuildings());
      } catch (err) {
        console.error("Failed to load buildings:", err);
        setError("Unable to load buildings.");
      } finally {
        setLoading(false);
      }
    };

    void loadBuildings();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header variant="public" />

      <main className="flex-1">
        <PageContainer>
          <div className="mx-auto max-w-7xl space-y-12 py-10">
            {/* Hero Section */}
            <section className="relative rounded-3xl border border-slate-200/80 bg-gradient-to-br from-[#0F2042] via-[#112856] to-[#0B192C] p-8 sm:p-12 text-white shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-[#00A3E0]/10 blur-3xl pointer-events-none" />
              
              <div className="relative max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#00A3E0]/40 bg-[#00A3E0]/10 px-3.5 py-1 text-xs font-semibold text-[#00A3E0]">
                  <HiBuildingOffice2 className="h-3.5 w-3.5" />
                  Internal Enterprise Solution
                </div>

                <h1 className="text-3xl font-bold tracking-tight sm:text-5xl leading-tight">
                  Smart Employee Parking Management
                </h1>

                <p className="text-base sm:text-lg leading-relaxed text-slate-300">
                  Check real-time capacity and live occupancy across all Temenos offices before arriving. Log in to book slots and manage registered vehicles.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button variant="teal" className="px-6 py-3 text-base" onClick={() => navigate(ROUTES.LOGIN)}>
                    Employee Login
                  </Button>
                  <Button variant="secondary" className="px-6 py-3 text-base border-slate-600 bg-white/10 text-white hover:bg-white/20" onClick={() => navigate(ROUTES.SIGNUP)}>
                    Request Access
                  </Button>
                </div>
              </div>
            </section>

            {/* Office Availability Section */}
            <section id="buildings" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#00A3E0]">Real-Time Status</span>
                  <h2 className="text-2xl font-bold text-[#0F2042]">Office Parking Availability</h2>
                </div>
                <p className="text-sm text-slate-500">Live capacity monitoring by branch</p>
              </div>

              {loading ? (
                <LoadingState message="Loading parking availability..." />
              ) : error ? (
                <EmptyState
                  title="Unable to load parking data"
                  description={error}
                  action={
                    <Button variant="secondary" onClick={() => window.location.reload()}>
                      Retry
                    </Button>
                  }
                />
              ) : buildings.length === 0 ? (
                <EmptyState
                  title="No buildings configured"
                  description="Parking availability will be displayed here once buildings are added."
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {buildings.map((branch) => {
                    const parkingAreas = getBranchParkingAreas(branch);
                    const branchCapacity = parkingAreas.reduce((sum, area) => sum + area.capacity, 0);
                    const branchOccupied = parkingAreas.reduce((sum, area) => sum + area.occupied, 0);
                    const branchAvailable = branchCapacity - branchOccupied;
                    const occupancyRate = branchCapacity ? Math.round((branchOccupied / branchCapacity) * 100) : 0;
                    const availabilityStatus = getAvailabilityStatus(branchAvailable, branchCapacity);
                    const availabilityBadge = getAvailabilityBadge(branchAvailable, branchCapacity);
                    const parkingStatus = getParkingStatus(branch);
                    const lastUpdated = formatUpdatedAt(branch.updatedAt);

                    return (
                      <Card key={branch.id} className="flex flex-col justify-between hover:shadow-md transition-all">
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-[#0F2042]">{branch.name}</h3>
                              <p className="mt-0.5 text-sm text-slate-500 flex items-center gap-1">
                                <HiMapPin className="h-4 w-4 text-[#00A3E0]" />
                                {branch.city}
                              </p>
                            </div>
                            <StatusBadge variant={parkingStatus === "Open" ? "success" : "danger"}>{parkingStatus}</StatusBadge>
                          </div>

                          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                              <div>
                                <p className="text-base font-bold text-[#0F2042]">{branchCapacity}</p>
                                <p className="text-xs text-slate-500">Capacity</p>
                              </div>
                              <div>
                                <p className="text-base font-bold text-emerald-600">{branchAvailable}</p>
                                <p className="text-xs text-slate-500">Available</p>
                              </div>
                              <div>
                                <p className="text-base font-bold text-rose-600">{branchOccupied}</p>
                                <p className="text-xs text-slate-500">Occupied</p>
                              </div>
                            </div>

                            <div className="mt-4 space-y-2">
                              {parkingAreas.map((area) => {
                                const areaAvailable = area.capacity - area.occupied;
                                const areaStatus = areaAvailable === 0 ? "Closed" : "Open";
                                const areaBadge = areaStatus === "Closed" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700";

                                return (
                                  <div key={area.key} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900">{area.label}</p>
                                        <p className="text-xs text-slate-500">{area.capacity} cap · {area.occupied} occupied</p>
                                      </div>
                                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${areaBadge}`}>{areaStatus}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-6 space-y-2.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-700">Occupancy</span>
                              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${availabilityBadge}`}>{availabilityStatus}</span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  occupancyRate > 90 ? "bg-rose-500" : occupancyRate > 70 ? "bg-amber-500" : "bg-[#00A3E0]"
                                }`}
                                style={{ width: `${Math.min(100, occupancyRate)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                              <span>{occupancyRate}% filled</span>
                              <span>{lastUpdated ? `Updated ${lastUpdated}` : "Real-time"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                          <a
                            href={getGoogleMapsUrl(branch)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#0F2042]"
                          >
                            <HiMapPin className="h-4 w-4 text-[#00A3E0]" />
                            View Directions
                          </a>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </PageContainer>
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-sm text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F2042]">Temenos</span>
            <span>|</span>
            <span>Smart Parking Access</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 Temenos. Internal Company Use Only.</p>
        </div>
      </footer>
    </div>
  );
}

