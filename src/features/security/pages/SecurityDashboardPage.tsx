import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../auth/hooks/useAuth";

import PageContainer from "../../../shared/components/PageContainer";
import Button from "../../../shared/components/Button";
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
        <div className="flex h-64 items-center justify-center text-red-600">{buildingError}</div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          Loading parking...
        </div>
      </PageContainer>
    );
  }

  if (!parking) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          No parking data found.
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-md space-y-6 py-8">

        <h1 className="text-3xl font-bold">
          Security Dashboard
        </h1>

        <Button fullWidth variant="secondary" onClick={() => navigate("/security/vehicle-logs")}>
          Vehicle Log
        </Button>

        {isDeveloper ? (
          <BuildingSelector
            buildings={buildings}
            selectedBuilding={selectedBuilding}
            onChange={setSelectedBuilding}
          />
        ) : (
          <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
            Updates are restricted to your assigned building.
          </p>
        )}

        <ParkingCounterList
          parking={parking}
          onIncrease={increase}
          onDecrease={decrease}
          isUpdating={isUpdating}
        />

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <p className="text-center text-sm text-slate-500">
          Changes are saved immediately and reflected on the home page.
        </p>

      </div>
    </PageContainer>
  );
}
