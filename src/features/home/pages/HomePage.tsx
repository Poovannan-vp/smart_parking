import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import EmptyState from "../../../shared/components/EmptyState";
import LoadingState from "../../../shared/components/LoadingState";
import Logo from "../../../shared/components/Logo";
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

function getAvailabilityBadge(available: number, capacity: number) {
  const status = getAvailabilityStatus(available, capacity);
  switch (status) {
    case "Full":
      return "bg-rose-100 text-rose-700";
    case "Almost Full":
      return "bg-amber-100 text-amber-700";
    case "Busy":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-emerald-100 text-emerald-700";
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
      } catch (error) {
        console.error("Failed to load buildings:", error);
        setError("Unable to load buildings.");
      } finally {
        setLoading(false);
      }
    };

    loadBuildings();
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Loading parking availability..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <EmptyState
          title="Unable to load parking data"
          description={error}
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-7xl space-y-10 py-10">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-white ">
              <Logo className="h-8" hideText={true} />
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="transition hover:text-slate-900">Home</button>
            <button type="button" onClick={() => document.getElementById("buildings")?.scrollIntoView({ behavior: "smooth" })} className="transition hover:text-slate-900">Office availability</button>
            <button type="button" onClick={() => navigate(ROUTES.LOGIN)} className="transition hover:text-slate-900">Login</button>
            <button type="button" onClick={() => navigate(ROUTES.SIGNUP)} className="rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-900 transition hover:bg-slate-200">Request access</button>
          </nav>
        </header>

        <section className="space-y-6">
          <div className="max-w-2xl space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Smart Parking Access</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">View parking availability for each office before you arrive.</h1>
            <p className="text-base leading-7 text-slate-600">Check real-time capacity and occupancy for every branch, then sign in or request access to continue.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => navigate(ROUTES.LOGIN)}>Login</Button>
            <Button variant="secondary" onClick={() => navigate(ROUTES.SIGNUP)}>Request access</Button>
          </div>
        </section>

        <section id="buildings" className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Office availability</p>
            <h2 className="text-2xl font-semibold text-slate-900">Parking by office</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {buildings.map((branch) => {
              const branchCapacity = Object.values(branch.parking).reduce((sum, area) => sum + (area ? area.capacity : 0), 0);
              const branchOccupied = Object.values(branch.parking).reduce((sum, area) => sum + (area ? area.occupied : 0), 0);
              const branchAvailable = branchCapacity - branchOccupied;
              const occupancyRate = branchCapacity ? Math.round((branchOccupied / branchCapacity) * 100) : 0;
              const availabilityStatus = getAvailabilityStatus(branchAvailable, branchCapacity);
              const availabilityBadge = getAvailabilityBadge(branchAvailable, branchCapacity);
              const lastUpdated = formatUpdatedAt(branch.updatedAt);

              return (
                <Card key={branch.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{branch.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{branch.city}</p>
                    </div>
                    <StatusBadge variant={branch.status === "Open" ? "success" : "danger"}>{branch.status}</StatusBadge>
                  </div>

                  <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <div>
                      <p className="font-semibold text-slate-900">{branchCapacity}</p>
                      <p>Total slots</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{branchAvailable}</p>
                      <p>Available</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{branchOccupied}</p>
                      <p>Occupied</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-900">Occupancy progress</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${availabilityBadge}`}>{availabilityStatus}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${Math.min(100, occupancyRate)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>{occupancyRate}% occupied</span>
                      <span>{lastUpdated ? `Updated ${lastUpdated}` : "Last updated unavailable"}</span>
                    </div>
                  </div>

                  <a
                    href={getGoogleMapsUrl(branch)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                  >
                    View on Google Maps
                  </a>
                </Card>
              );
            })}
          </div>
        </section>

        <footer className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p>Temenos | Smart Parking Access</p>
    <p>© 2026 Temenos. Internal Use Only.</p>
  </div>
</footer>
      </div>
    </PageContainer>
  );
}
