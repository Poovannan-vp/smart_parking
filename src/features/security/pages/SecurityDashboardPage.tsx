import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../auth/hooks/useAuth";

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
      } catch (error) {
        console.error("Failed to load buildings", error);
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
      <div className="mx-auto max-w-6xl space-y-8 py-8">
        <PageHeader
          title="Security Dashboard"
          subtitle="Manage live parking occupancy and vehicle access for your assigned building."
        />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Total capacity</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{totalCapacity}</p>
          </Card>
          <Card>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Occupied</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{totalOccupied}</p>
          </Card>
          <Card>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Available slots</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{totalAvailable}</p>
            <p className="mt-2 text-sm text-slate-500">{utilization}% utilized</p>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Security controls</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Update parking occupancy and access the vehicle log.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => navigate("/security/vehicle-logs")}>Vehicle Log</Button>
              </div>

              {isDeveloper ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Developer mode</span>
                    <StatusBadge variant="info">All buildings</StatusBadge>
                  </div>
                  <BuildingSelector
                    buildings={buildings}
                    selectedBuilding={selectedBuilding}
                    onChange={setSelectedBuilding}
                  />
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Updates are restricted to your assigned building.
                </div>
              )}
            </Card>

            <Card>
              <ParkingCounterList
                parking={parking}
                onIncrease={increase}
                onDecrease={decrease}
                isUpdating={isUpdating}
              />
            </Card>

            {error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
                {error}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-slate-900">Quick notes</h2>
              <p className="mt-3 text-sm text-slate-600">
                Changes are saved immediately and reflected on the home page and employee availability reports.
              </p>
            </Card>
            <Card>
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Action guidance</p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Update only the assigned building unless you are a developer.</li>
                  <li>• Use the vehicle log page for exit and correction actions.</li>
                  <li>• Keep occupancy within capacity limits.</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
