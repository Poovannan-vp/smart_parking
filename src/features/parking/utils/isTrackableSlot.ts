/**
 * Which ParkingSlot objects are actual, individually-trackable parking
 * slots (get an operational status) versus static layout objects
 * (pillars, passages, lift lobby, etc. - never get status or interaction).
 *
 * A slot is trackable when either:
 * - it was extracted from the source as an individual numbered parking
 *   space (`parkingArea === "PARKING_SPACE"`, set by the Excel importer -
 *   car/bike classification is deliberately not decided at that stage, so
 *   these slots currently carry the neutral `type: "utility"`), or
 * - it already has one of the real parkable types (set when an Admin adds
 *   or classifies a slot directly in the layout editor).
 *
 * Single shared predicate so every consumer (rendering, status lookups,
 * write authorization checks) agrees on the same definition.
 */

import type { ParkingSlot } from "../../../types/parkingLayout";

const TRACKABLE_TYPES: ReadonlyArray<ParkingSlot["type"]> = ["standard", "accessible", "compact", "bike"];

export function isTrackableSlot(slot: ParkingSlot): boolean {
  return slot.parkingArea === "PARKING_SPACE" || TRACKABLE_TYPES.includes(slot.type);
}
