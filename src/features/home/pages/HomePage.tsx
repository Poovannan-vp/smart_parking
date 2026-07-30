import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import HeroSection from "../components/HeroSection";
import BuildingSelector from "../components/BuildingSelector";
import BuildingInfoCard from "../components/BuildingInfoCard";
import ParkingStatusCard from "../components/ParkingStatusCard";

import Button from "../../../shared/components/Button";
import PageContainer from "../../../shared/components/PageContainer";

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

  // Load all buildings for dropdown
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

  // Subscribe to selected building
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

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-500">Loading parking information...</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !building) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <p className="text-red-500">
            {error ?? "Unable to load building information."}
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-md space-y-6 py-8">
        <HeroSection />

        <BuildingSelector
          buildings={buildings}
          selectedBuilding={selectedBuilding}
          onChange={setSelectedBuilding}
        />

        <BuildingInfoCard building={building} />

        <ParkingStatusCard building={building} />

        <Button
          fullWidth
          onClick={() => navigate("/login")}
        >
          Staff Login
        </Button>

        <p className="text-center text-sm text-slate-500">
          Employees, Security, Admin, and Developers
        </p>
      </div>
    </PageContainer>
  );
}
