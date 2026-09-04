/**
 * Realtime access to a Layout's current slot statuses. Shared by Employee,
 * Security, and Admin - same mechanism every time.
 */

import { useEffect, useState } from "react";
import { subscribeToSlotStatuses } from "../../../services/slotStatusService";
import type { SlotStatusEntry, SlotStatusValue } from "../../../types/parkingLayout";

interface SlotStatusesState {
  forKey: string | undefined;
  statuses: Record<string, SlotStatusEntry>;
  loading: boolean;
  error: string | null;
}

function statusKey(locationId: string | undefined, layoutId: string | undefined): string | undefined {
  return locationId && layoutId ? `${locationId}/${layoutId}` : undefined;
}

/**
 * Realtime statuses for a Layout's trackable slots, keyed by ParkingSlot.id.
 * Like `useLocationLayouts`/`useLayout`, `loading`/`statuses` are derived
 * against the current (locationId, layoutId) pair on every render, so
 * switching buildings/layouts never briefly reads a previous layout's
 * statuses as if they belonged to the newly selected one.
 *
 * `getStatus(slotId)` defaults to "AVAILABLE" for any slot with no stored
 * status yet - that is the normal, expected state, not an error.
 */
export function useSlotStatuses(locationId: string | undefined, layoutId: string | undefined) {
  const [state, setState] = useState<SlotStatusesState>({
    forKey: undefined,
    statuses: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    const key = statusKey(locationId, layoutId);

    if (!locationId || !layoutId) {
      setState({ forKey: key, statuses: {}, loading: false, error: null });
      return;
    }

    setState({ forKey: key, statuses: {}, loading: true, error: null });

    const unsubscribe = subscribeToSlotStatuses(
      locationId,
      layoutId,
      (statuses) => {
        setState({ forKey: key, statuses, loading: false, error: null });
      },
      (subscriptionError) => {
        setState({ forKey: key, statuses: {}, loading: false, error: subscriptionError.message });
      },
    );

    return unsubscribe;
  }, [locationId, layoutId]);

  const isCurrent = state.forKey === statusKey(locationId, layoutId);
  const statuses = isCurrent ? state.statuses : {};

  function getStatus(slotId: string): SlotStatusValue {
    return statuses[slotId]?.status ?? "AVAILABLE";
  }

  return {
    statuses,
    getStatus,
    loading: !isCurrent || state.loading,
    error: isCurrent ? state.error : null,
  };
}
