import { useEffect, useState } from "react";
import { HiChartBarSquare, HiShieldCheck } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";

import BuildingSelector from "../components/BuildingSelector";
import BuildingInfoCard from "../components/BuildingInfoCard";
import ParkingStatusCard from "../components/ParkingStatusCard";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import EmptyState from "../../../shared/components/EmptyState";
import LoadingState from "../../../shared/components/LoadingState";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import StatusBadge from "../../../shared/components/StatusBadge";

import {
  getBuildings,
  subscribeToBuilding,
  type BuildingOption,
} from "../../../services/buildingService";

import type { Building } from "../../../types/building";

export default function HomePage() {
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const buildingList = await getBuildings();
        setBuildings(buildingList);
        if (buildingList.length > 0) {
          setSelectedBuilding(buildingList[0].id);
        }
      } catch (error) {
        console.error("Failed to load buildings:", error);
        setError("Unable to load buildings.");
        setLoading(false);
      }
    };

    loadBuildings();
  }, []);

  useEffect(() => {
    if (!selectedBuilding) return;

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToBuilding(
      selectedBuilding,
      (data) => {
        setBuilding(data);
        setLoading(false);
      },
      () => {
        setError("Unable to receive real-time parking updates.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [selectedBuilding]);

  const totalCapacity = building
    ? Object.values(building.parking).reduce((sum, area) => sum + (area ? area.capacity : 0), 0)
    : 0;
  const totalOccupied = building
    ? Object.values(building.parking).reduce((sum, area) => sum + (area ? area.occupied : 0), 0)
    : 0;
  const totalAvailable = totalCapacity - totalOccupied;

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Loading parking availability..." />
      </PageContainer>
    );
  }

  if (error || !building) {
    return (
      <PageContainer>
        <EmptyState
          title="Unable to load parking data"
          description={error ?? "We could not retrieve building information at this time."}
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
        <PageHeader
          title="Smart Parking Management"
          subtitle="Enterprise parking visibility, role-based workflows, and live building occupancy at a glance."
          actions={
            <Button variant="primary" onClick={() => navigate("/login")}>Staff Login</Button>
          }
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_420px]">
          <div className="space-y-6 rounded-[2rem] bg-slate-950 p-10 text-white shadow-2xl shadow-slate-900/20">
            <div className="rounded-[2rem] bg-white/10 p-6 shadow-inner shadow-slate-950/10">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Live campus control</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight">See parking availability before you arrive.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Monitor building occupancy, capacity, and access workflows using a modern dashboard built for employees, security teams, and administrators.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Buildings</p>
                <p className="mt-3 text-3xl font-semibold">{buildings.length}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Available spaces</p>
                <p className="mt-3 text-3xl font-semibold">{totalAvailable}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Current building</p>
                <p className="mt-3 text-3xl font-semibold">{building.name}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-900/70 p-5">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <HiChartBarSquare className="h-5 w-5 text-slate-300" />
                  <span>Occupancy status</span>
                </div>
                <p className="mt-4 text-2xl font-semibold">{Math.round((totalOccupied / Math.max(totalCapacity, 1)) * 100)}%</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${Math.min(100, Math.round((totalOccupied / Math.max(totalCapacity, 1)) * 100))}%` }} />
                </div>
              </div>
              <div className="rounded-3xl bg-slate-900/70 p-5">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <HiShieldCheck className="h-5 w-5 text-slate-300" />
                  <span>Security readiness</span>
                </div>
                <p className="mt-4 text-2xl font-semibold">Instant gate control</p>
                <p className="mt-3 text-sm text-slate-400">Built for fast entry, exit, and audit workflows.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Building selector</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Live campus switching</p>
                </div>
                <div className="max-w-xs">
                  <BuildingSelector
                    buildings={buildings}
                    selectedBuilding={selectedBuilding}
                    onChange={setSelectedBuilding}
                  />
                </div>
              </div>
              <div className="mt-6 grid gap-4">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <div className="text-sm uppercase tracking-[0.24em] text-slate-500">Location</div>
                  <p className="mt-3 text-xl font-semibold text-slate-900">{building.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{building.city}</p>
                  <StatusBadge variant={building.status === "Open" ? "success" : "danger"} className="mt-4 inline-flex">
                    {building.status}
                  </StatusBadge>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <div className="text-sm uppercase tracking-[0.24em] text-slate-500">Parking progress</div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${Math.min(100, Math.round((totalOccupied / Math.max(totalCapacity, 1)) * 100))}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                    <span>{totalOccupied} occupied</span>
                    <span>{totalAvailable} available</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Focus areas</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">What matters most</p>
                </div>
                <Button variant="ghost" onClick={() => navigate("/login")}>Enter portal</Button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">Live availability</p>
                  <p className="mt-2 text-sm text-slate-600">View open and closed spaces in real time.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">Role-based ops</p>
                  <p className="mt-2 text-sm text-slate-600">Employees, security, and admin workflows.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">Data insights</p>
                  <p className="mt-2 text-sm text-slate-600">Track parking utilization across sites.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800">Audit ready</p>
                  <p className="mt-2 text-sm text-slate-600">Vehicle log history and system diagnostics.</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Building details</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">Operational overview</p>
              </div>
            </div>
            <div className="mt-6 space-y-6">
              <BuildingInfoCard building={building} />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Parking areas</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">Current occupancy</p>
              </div>
            </div>
            <div className="mt-6">
              <ParkingStatusCard building={building} />
            </div>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
