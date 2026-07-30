import { useEffect, useState } from "react";

import type { Parking } from "../../../types/parking";

import {
  getParking,
  updateParking,
} from "../../../services/parkingService";

export default function useParking(buildingId: string) {
  const [parking, setParking] = useState<Parking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!buildingId) return;

    async function loadParking() {
      setLoading(true);

      const data = await getParking(buildingId);

      setParking(data);

      setLoading(false);
    }

    loadParking();
  }, [buildingId]);

  function increase(area: keyof Parking) {
    if (!parking || !parking[area]) return;

    setParking({
      ...parking,
      [area]: {
        ...parking[area]!,
        occupied: parking[area]!.occupied + 1,
      },
    });
  }

  function decrease(area: keyof Parking) {
    if (!parking || !parking[area]) return;

    if (parking[area]!.occupied === 0) return;

    setParking({
      ...parking,
      [area]: {
        ...parking[area]!,
        occupied: parking[area]!.occupied - 1,
      },
    });
  }

async function save() {
  if (!parking) return;

  console.log("Saving...", parking);

  await updateParking(buildingId, parking);
}

  return {
    parking,
    loading,
    increase,
    decrease,
    save,
  };
}