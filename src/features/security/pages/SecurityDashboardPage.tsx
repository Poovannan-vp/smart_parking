import { useEffect, useState } from "react";
import useAuth from "../../auth/hooks/useAuth";

import PageContainer from "../../../shared/components/PageContainer";
import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";
import PageHeader from "../../../shared/components/PageHeader";
import LoadingState from "../../../shared/components/LoadingState";
import EmptyState from "../../../shared/components/EmptyState";
import StatusBadge from "../../../shared/components/StatusBadge";
import BuildingSelector from "../../home/components/BuildingSelector";
import { PhysicalLayoutView, LayoutSelector, useLocationLayouts, useLayout, useSlotStatuses } from "../../parking";

import {
  getBuildings,
  type BuildingOption,
} from "../../../services/buildingService";
import { setSlotStatus } from "../../../services/slotStatusService";
import type { ParkingSlot, SlotStatusValue } from "../../../types/parkingLayout";

import useParking from "../hooks/useParking";

export default function SecurityDashboardPage() {
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

  const { parking, loading } = useParking(selectedBuilding);

  const [selectedLayoutId, setSelectedLayoutId] = useState("");
  const { layouts } = useLocationLayouts(selectedBuilding || undefined);
  const { layout } = useLayout(selectedBuilding || undefined, selectedLayoutId || undefined);
  const { getStatus } = useSlotStatuses(selectedBuilding || undefined, selectedLayoutId || undefined);

  useEffect(() => {
    if (layouts.length === 0) return;
    if (!layouts.some((l) => l.id === selectedLayoutId)) {
      setSelectedLayoutId(layouts[0].id);
    }
  }, [layouts, selectedLayoutId]);

  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Never keep a slot selected across a building/layout switch
  useEffect(() => {
    setSelectedSlot(null);
    setStatusError(null);
  }, [selectedBuilding, selectedLayoutId]);

  async function handleSetStatus(status: SlotStatusValue) {
    if (!selectedSlot || !selectedBuilding || !selectedLayoutId) return;

    setSavingStatus(true);
    setStatusError(null);

    try {
      await setSlotStatus(selectedBuilding, selectedLayoutId, selectedSlot.id, status, user?.uid ?? "security");
      setSelectedSlot(null);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Unable to update slot status.");
    } finally {
      setSavingStatus(false);
    }
  }

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

  return (
    <PageContainer>
      <div className="mx-auto max-w-6xl space-y-8 py-4">
        <PageHeader
          title="Security Operations Dashboard"
          subtitle="Monitor and update parking status for your office."
        />

        {isDeveloper ? (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 space-y-3">
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {layouts.length > 0 && (
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <h2 className="text-base font-bold text-temenos-navy">Parking Layout</h2>
                  {layouts.length > 1 ? (
                    <LayoutSelector layouts={layouts} selectedLayoutId={selectedLayoutId} onChange={setSelectedLayoutId} />
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-slate-500">Select a parking slot below to update its status.</p>
                <div className="mt-4">
                  <PhysicalLayoutView
                    slots={layout?.slots ?? []}
                    getSlotStatus={getStatus}
                    onSlotClick={setSelectedSlot}
                    selectedSlot={selectedSlot}
                    onStatusChange={(status) => void handleSetStatus(status)}
                    savingStatus={savingStatus}
                    statusError={statusError}
                    onClosePopover={() => setSelectedSlot(null)}
                  />
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <div className="space-y-3">
                <p className="text-sm font-bold text-temenos-navy">Operational Rules</p>
                <ul className="space-y-2 text-xs text-slate-600">
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

