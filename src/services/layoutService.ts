/**
 * Layout service
 *
 * A Location (building) can own one or more Layouts. Each Layout is a
 * generic named physical layout - the name carries no special meaning.
 * Layouts live in Firestore as a subcollection of the existing canonical
 * building document: buildings/{buildingId}/layouts/{layoutId}.
 *
 * No Layout document is ever created empty. The very first layout an Admin
 * uploads and saves for a location is written, geometry and all, as a real
 * "Default Parking" Layout at the fixed id "default" - fixed, not derived
 * from the name, so it can never be duplicated even if saved concurrently.
 * Every later "Add Layout" creates a separate, independent, non-default
 * document instead.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  updateDoc,
  addDoc,
} from "firebase/firestore";

import { db } from "../config/firestore";
import type { Layout, ParkingSlot } from "../types/parkingLayout";

const DEFAULT_LAYOUT_ID = "default";
export const DEFAULT_LAYOUT_NAME = "Default Parking";

function layoutsCollection(locationId: string) {
  return collection(db, "buildings", locationId, "layouts");
}

function layoutDoc(locationId: string, layoutId: string) {
  return doc(db, "buildings", locationId, "layouts", layoutId);
}

function toLayout(id: string, locationId: string, data: Record<string, unknown>): Layout {
  return {
    id,
    locationId,
    name: (data.name as string) ?? DEFAULT_LAYOUT_NAME,
    isDefault: Boolean(data.isDefault),
    slots: (data.slots as ParkingSlot[]) ?? [],
    blueprintImage: data.blueprintImage as string | undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy as string | undefined,
  };
}

function sortLayouts(layouts: Layout[]): Layout[] {
  return [...layouts].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * One-time fetch of every Layout belonging to a location, default first.
 */
export async function getLayouts(locationId: string): Promise<Layout[]> {
  const snapshot = await getDocs(query(layoutsCollection(locationId), orderBy("name")));
  return sortLayouts(snapshot.docs.map((d) => toLayout(d.id, locationId, d.data())));
}

/**
 * Subscribe in realtime to every Layout belonging to a location, default
 * first. Only reflects saved layouts - never an in-progress admin edit.
 */
export function subscribeToLayouts(
  locationId: string,
  callback: (layouts: Layout[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    query(layoutsCollection(locationId), orderBy("name")),
    (snapshot) => {
      callback(sortLayouts(snapshot.docs.map((d) => toLayout(d.id, locationId, d.data()))));
    },
    onError,
  );
}

/**
 * One-time fetch of a single Layout's saved geometry (used by the Admin
 * editor when it opens a layout - after this, edits stay local until Save).
 */
export async function getLayout(locationId: string, layoutId: string): Promise<Layout | null> {
  const snapshot = await getDoc(layoutDoc(locationId, layoutId));
  if (!snapshot.exists()) return null;
  return toLayout(snapshot.id, locationId, snapshot.data());
}

/**
 * Subscribe in realtime to a single Layout's saved geometry (used by
 * Employee/Security, and anyone else just viewing rather than editing).
 */
export function subscribeToLayout(
  locationId: string,
  layoutId: string,
  callback: (layout: Layout | null) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    layoutDoc(locationId, layoutId),
    (snapshot) => {
      callback(snapshot.exists() ? toLayout(snapshot.id, locationId, snapshot.data()) : null);
    },
    onError,
  );
}

/**
 * Save a location's first-ever Layout. Always written as the real
 * "Default Parking" layout, geometry included - there is no empty
 * placeholder step. The fixed document id means a second, concurrent
 * first save can only overwrite this same document, never create a
 * duplicate default.
 */
export async function createDefaultLayout(
  locationId: string,
  slots: ParkingSlot[],
  updatedBy: string,
  blueprintImage?: string,
): Promise<string> {
  await setDoc(layoutDoc(locationId, DEFAULT_LAYOUT_ID), {
    locationId,
    name: DEFAULT_LAYOUT_NAME,
    isDefault: true,
    slots,
    ...(blueprintImage !== undefined ? { blueprintImage } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy,
  });

  return DEFAULT_LAYOUT_ID;
}

/**
 * Save a new, additional, admin-named Layout for a location that already
 * has one - geometry included, never created empty. Returns its stable id
 * (never derived from the name). Never touches any other Layout document.
 */
export async function createNamedLayout(
  locationId: string,
  name: string,
  slots: ParkingSlot[],
  updatedBy: string,
  blueprintImage?: string,
): Promise<string> {
  const document = await addDoc(layoutsCollection(locationId), {
    locationId,
    name,
    isDefault: false,
    slots,
    ...(blueprintImage !== undefined ? { blueprintImage } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy,
  });

  return document.id;
}

/**
 * Save a Layout's physical geometry. This is the only write that produces
 * what other authorized users' realtime listeners receive - local admin
 * edits before this call are never persisted or streamed.
 */
export async function saveLayoutSlots(
  locationId: string,
  layoutId: string,
  slots: ParkingSlot[],
  updatedBy: string,
  blueprintImage?: string,
): Promise<void> {
  await updateDoc(layoutDoc(locationId, layoutId), {
    slots,
    ...(blueprintImage !== undefined ? { blueprintImage } : {}),
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}
