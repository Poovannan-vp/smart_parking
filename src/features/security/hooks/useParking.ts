import { useEffect, useState } from "react";

import type { Parking } from "../../../types/parking";

import {
  changeParkingOccupancy,
} from "../../../services/parkingService";
import { subscribeToBuilding } from "../../../services/buildingService";

export default function useParking(buildingId: string) {
  const [parking, setParking] = useState<Parking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAreas, setUpdatingAreas] = useState<Set<keyof Parking>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!buildingId) {
      setParking(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    return subscribeToBuilding(
      buildingId,
      (building) => {
        setParking(building?.parking ?? null);
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message);
        setLoading(false);
      },
    );
  }, [buildingId]);

  async function changeOccupancy(area: keyof Parking, change: 1 | -1) {
    if (!buildingId || updatingAreas.has(area)) return;

    setUpdatingAreas((currentAreas) => new Set(currentAreas).add(area));
    setError(null);

    try {
      await changeParkingOccupancy(buildingId, area, change);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update parking occupancy.",
      );
    } finally {
      setUpdatingAreas((currentAreas) => {
        const nextAreas = new Set(currentAreas);
        nextAreas.delete(area);
        return nextAreas;
      });
    }
  }

  return {
    parking,
    loading,
    isUpdating: (area: keyof Parking) => updatingAreas.has(area),
    error,
    increase: (area: keyof Parking) => changeOccupancy(area, 1),
    decrease: (area: keyof Parking) => changeOccupancy(area, -1),
  };
}
