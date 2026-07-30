import { useEffect, useState } from "react";

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
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");

  useEffect(() => {
    async function loadBuildings() {
      try {
        const data = await getBuildings();

        setBuildings(data);

        if (data.length > 0) {
          setSelectedBuilding(data[0].id);
        }
      } catch (error) {
        console.error("Failed to load buildings", error);
      }
    }

    loadBuildings();
  }, []);

  const {
    parking,
    loading,
    increase,
    decrease,
    save,
  } = useParking(selectedBuilding);

 async function handleSave() {
  console.log("Handle Save");

  try {
    await save();

    console.log("Save Completed");
  } catch (error) {
    console.error(error);
  }
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

        <BuildingSelector
          buildings={buildings}
          selectedBuilding={selectedBuilding}
          onChange={setSelectedBuilding}
        />

        <ParkingCounterList
          parking={parking}
          onIncrease={increase}
          onDecrease={decrease}
        />

<Button
  fullWidth
  onClick={() => {
    console.log("Button Clicked");
    handleSave();
  }}
>
  Update Parking
</Button>

      </div>
    </PageContainer>
  );
}