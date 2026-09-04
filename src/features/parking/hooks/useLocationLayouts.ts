/**
 * Realtime access to the Layouts belonging to a location (building).
 * Shared by Employee, Security, and Admin - the same mechanism every time,
 * never conditioned on a particular location or layout name.
 */

import { useEffect, useState } from "react";
import { subscribeToLayouts, subscribeToLayout } from "../../../services/layoutService";
import type { Layout } from "../../../types/parkingLayout";

interface LayoutsState {
  forLocationId: string | undefined;
  layouts: Layout[];
  loading: boolean;
  error: string | null;
}

/**
 * Realtime list of a location's Layouts, default first. A location with no
 * saved layout yet simply reports an empty list - no placeholder document
 * is ever created as a side effect of viewing it. The first successful
 * Admin save is what creates the real "Default Parking" layout.
 *
 * `loading`/`layouts` are derived against the *current* locationId on every
 * render (not just once the effect below has run), so a caller that reacts
 * to `loading` right after switching locations never reads a stale, empty
 * `layouts` left over from the previous location as if it belonged to the
 * new one - it always sees `loading: true` until the new location's real
 * data has actually arrived.
 */
export function useLocationLayouts(locationId: string | undefined) {
  const [state, setState] = useState<LayoutsState>({
    forLocationId: undefined,
    layouts: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!locationId) {
      setState({ forLocationId: locationId, layouts: [], loading: false, error: null });
      return;
    }

    setState({ forLocationId: locationId, layouts: [], loading: true, error: null });

    const unsubscribe = subscribeToLayouts(
      locationId,
      (nextLayouts) => {
        setState({ forLocationId: locationId, layouts: nextLayouts, loading: false, error: null });
      },
      (subscriptionError) => {
        setState({ forLocationId: locationId, layouts: [], loading: false, error: subscriptionError.message });
      },
    );

    return unsubscribe;
  }, [locationId]);

  const isCurrent = state.forLocationId === locationId;

  return {
    layouts: isCurrent ? state.layouts : [],
    loading: !isCurrent || state.loading,
    error: isCurrent ? state.error : null,
  };
}

interface LayoutState {
  forKey: string | undefined;
  layout: Layout | null;
  loading: boolean;
  error: string | null;
}

function layoutKey(locationId: string | undefined, layoutId: string | undefined): string | undefined {
  return locationId && layoutId ? `${locationId}/${layoutId}` : undefined;
}

/**
 * Realtime saved geometry for a single Layout. Reflects only what the
 * Admin has explicitly saved - never an in-progress edit. Like
 * `useLocationLayouts` above, `loading`/`layout` are derived against the
 * current (locationId, layoutId) pair on every render so a caller never
 * reads a previous layout's geometry as if it were the newly selected one.
 */
export function useLayout(locationId: string | undefined, layoutId: string | undefined) {
  const [state, setState] = useState<LayoutState>({
    forKey: undefined,
    layout: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const key = layoutKey(locationId, layoutId);

    if (!locationId || !layoutId) {
      setState({ forKey: key, layout: null, loading: false, error: null });
      return;
    }

    setState({ forKey: key, layout: null, loading: true, error: null });

    const unsubscribe = subscribeToLayout(
      locationId,
      layoutId,
      (nextLayout) => {
        setState({ forKey: key, layout: nextLayout, loading: false, error: null });
      },
      (subscriptionError) => {
        setState({ forKey: key, layout: null, loading: false, error: subscriptionError.message });
      },
    );

    return unsubscribe;
  }, [locationId, layoutId]);

  const isCurrent = state.forKey === layoutKey(locationId, layoutId);

  return {
    layout: isCurrent ? state.layout : null,
    loading: !isCurrent || state.loading,
    error: isCurrent ? state.error : null,
  };
}
