/**
 * Slot status service
 *
 * Operational AVAILABLE/OCCUPIED/BLOCKED status for a Layout's trackable
 * parking slots. Kept entirely separate from the Layout's physical
 * geometry (buildings/{buildingId}/layouts/{layoutId}) - this never reads
 * or writes that document. Status lives one level deeper, in a single
 * document per layout:
 *
 *   buildings/{buildingId}/layouts/{layoutId}/status/current
 *   { slots: { "<ParkingSlot.id>": { status, updatedAt, updatedBy } } }
 *
 * A slot with no entry in `slots` is not "missing data" - it simply has
 * never had its status changed, and is treated as AVAILABLE by callers.
 * Nothing is written merely because a layout was loaded or viewed.
 */

import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../config/firestore";
import type { SlotStatusEntry, SlotStatusValue } from "../types/parkingLayout";

/** Exported so services that must update slot status inside their own transaction (e.g. vehicleLogService, keeping a log and its slot's occupancy atomic) can address the same document without duplicating this path. */
export function statusDoc(locationId: string, layoutId: string) {
  return doc(db, "buildings", locationId, "layouts", layoutId, "status", "current");
}

/**
 * Subscribe in realtime to a layout's current slot statuses, keyed by
 * ParkingSlot.id. Reports an empty map if no slot has ever had its status
 * changed yet - callers should treat any slot missing from this map as
 * AVAILABLE rather than treating that as an error.
 */
export function subscribeToSlotStatuses(
  locationId: string,
  layoutId: string,
  callback: (statuses: Record<string, SlotStatusEntry>) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    statusDoc(locationId, layoutId),
    (snapshot) => {
      const data = snapshot.data();
      callback((data?.slots as Record<string, SlotStatusEntry> | undefined) ?? {});
    },
    onError,
  );
}

/**
 * Set a single existing parking slot's status, addressed by its stable
 * ParkingSlot.id (never its display slotNumber). Uses `set` with `merge`
 * rather than `update` so the very first status change for a layout
 * (before the status document exists at all) succeeds the same way a
 * later change does - merge recursively preserves every other slot's
 * entry under `slots`, it does not replace the whole map.
 *
 * Only used for the vehicle-free AVAILABLE/BLOCKED transitions - marking a
 * slot OCCUPIED with a vehicle, or freeing it again, goes through
 * vehicleLogService (createVehicleLog/exitVehicleLog) instead, so the log
 * and the slot's status change together. Any vehicle fields left over from
 * a previous occupancy are cleared here defensively.
 */
export async function setSlotStatus(
  locationId: string,
  layoutId: string,
  slotId: string,
  status: SlotStatusValue,
  updatedBy: string,
): Promise<void> {
  await setDoc(
    statusDoc(locationId, layoutId),
    {
      slots: {
        [slotId]: {
          status,
          updatedAt: serverTimestamp(),
          updatedBy,
          vehicleNumber: null,
          vehicleType: null,
          logId: null,
          employeeName: null,
        },
      },
    },
    { merge: true },
  );
}
