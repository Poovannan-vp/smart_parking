import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../auth/hooks/useAuth";
import { ROUTES } from "../../../app/routes";

import PageContainer from "../../../shared/components/PageContainer";
import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";
import PageHeader from "../../../shared/components/PageHeader";
import LoadingState from "../../../shared/components/LoadingState";
import EmptyState from "../../../shared/components/EmptyState";
import StatusBadge from "../../../shared/components/StatusBadge";
import BuildingSelector from "../../home/components/BuildingSelector";
import ParkingCounterList from "../components/ParkingCounterList";

import {
  getBuildings,
  type BuildingOption,
} from "../../../services/buildingService";

import useParking from "../hooks/useParking";

export default function SecurityDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDeveloper = user?.role === "DEVELOPER";
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [buildingError, setBuildingError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBuildings() {
      if (!isDeveloper) {
        if (!user?.buildingId) {
          setBuildingError("Your account has no assigned building. Ask an Admin to assign one.");
          return;
        }

        setSelectedBuilding(user.buildingId);
        return;
      }

      try {
        const data = await getBuildings();
        setBuildings(data);
        if (data.length > 0) {
          setSelectedBuilding(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load buildings", err);
        setBuildingError("Unable to load buildings.");
      }
    }

    void loadBuildings();
  }, [isDeveloper, user?.buildingId]);

  const {
    parking,
    loading,
    isUpdating,
    error,
    increase,
    decrease,
  } = useParking(selectedBuilding);

  if (buildingError) {
    return (
      <PageContainer>
        <EmptyState
          title="Unable to access building data"
          description={buildingError}
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Loading security dashboard..." />
      </PageContainer>
    );
  }

  if (!parking) {
    return (
      <PageContainer>
        <EmptyState
          title="No parking information available"
          description="This building does not have any current parking configuration available."
        />
      </PageContainer>
    );
  }

  const totalCapacity = Object.values(parking).reduce((sum, area) => sum + (area ? area.capacity : 0), 0);
  const totalOccupied = Object.values(parking).reduce((sum, area) => sum + (area ? area.occupied : 0), 0);
  const totalAvailable = totalCapacity - totalOccupied;
  const utilization = totalCapacity ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-8 py-4">
        <PageHeader
          title="Security Operations Dashboard"
          subtitle="Real-time gate management, parking occupancy controls, and vehicle access for your office."
        />

        {/* Summary Metrics */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#00A3E0]">Total Capacity</span>
            <p className="mt-2 text-3xl font-bold text-[#0F2042]">{totalCapacity}</p>
            <p className="mt-1 text-xs text-slate-500">Configured slots</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Available</span>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{totalAvailable}</p>
            <p className="mt-1 text-xs text-slate-500">Free parking slots</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500">Occupied</span>
            <p className="mt-2 text-3xl font-bold text-rose-600">{totalOccupied}</p>
            <p className="mt-1 text-xs text-slate-500">{utilization}% utilization</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#0F2042]">Live Occupancy Counters</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Increment or decrement parking counters as vehicles enter or exit.
                  </p>
                </div>
                <Button variant="teal" onClick={() => navigate(ROUTES.VEHICLE_LOGS)}>
                  Enter Vehicle Log
                </Button>
              </div>

              {isDeveloper ? (
                <div className="mt-4 p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                    <span>Developer Override</span>
                    <StatusBadge variant="info">All Buildings Access</StatusBadge>
                  </div>
                  <BuildingSelector
                    buildings={buildings}
                    selectedBuilding={selectedBuilding}
                    onChange={setSelectedBuilding}
                  />
                </div>
              ) : null}

              <div className="mt-6">
                <ParkingCounterList
                  parking={parking}
                  onIncrease={increase}
                  onDecrease={decrease}
                  isUpdating={isUpdating}
                />
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700" role="alert">
                  {error}
                </div>
              ) : null}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h2 className="text-base font-bold text-[#0F2042]">Live Operations</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Occupancy adjustments are saved immediately and updated live on the public landing page and employee dashboards.
              </p>
            </Card>
            <Card>
              <div className="space-y-3">
                <p className="text-sm font-bold text-[#0F2042]">Operational Rules</p>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-1.5">• Counters enforce strict capacity limits.</li>
                  <li className="flex items-start gap-1.5">• Use the Gate Vehicle Log page to log vehicle license plates.</li>
                  <li className="flex items-start gap-1.5">• Audit corrections require a recorded reason for system compliance.</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

