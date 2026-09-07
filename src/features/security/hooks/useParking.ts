import { useEffect, useState } from "react";

import type { Parking } from "../../../types/parking";
import { subscribeToBuilding } from "../../../services/buildingService";

/**
 * A building's current parking-area capacity/occupied buckets, realtime.
 * Occupancy for individually tracked slots is a separate system
 * (slotStatusService); this remains the source for buildings/areas without
 * a slot-level layout - bikes, in particular, have no layout at all.
 */
export default function useParking(buildingId: string) {
  const [parking, setParking] = useState<Parking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!buildingId) {
      setParking(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    return subscribeToBuilding(
      buildingId,
      (building) => {
        setParking(building?.parking ?? null);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
  }, [buildingId]);

  return { parking, loading };
}
