import {
  addDoc,
  collection,
  getDocs,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../config/firestore";
import type { Building } from "../types/building";
import type { Parking } from "../types/parking";

export interface BuildingOption {
  id: string;
  name: string;
}

export interface ManagedBuilding extends Building {
  id: string;
}

export interface BuildingInput {
  name: string;
  city: string;
  status: "Open" | "Closed";
  parking: Parking;
}

/**
 * Get all buildings for the selector
 */
export async function getBuildings(): Promise<BuildingOption[]> {
  const snapshot = await getDocs(collection(db, "buildings"));

  return snapshot.docs.map((document) => {
    const data = document.data() as Building;

    return {
      id: document.id,
      name: data.name,
    };
  });
}

/**
 * Subscribe to a building in realtime
 */
export function subscribeToBuilding(
  buildingId: string,
  callback: (building: Building | null) => void,
  onError?: (error: Error) => void,
) {
  const documentRef = doc(db, "buildings", buildingId);

  return onSnapshot(
    documentRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      callback(snapshot.data() as Building);
    },
    onError,
  );
}

export async function getManagedBuildings(): Promise<ManagedBuilding[]> {
  const snapshot = await getDocs(collection(db, "buildings"));

  return snapshot.docs
    .map((document) => ({
      id: document.id,
      ...(document.data() as Building),
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export async function createBuilding(building: BuildingInput) {
  const document = await addDoc(collection(db, "buildings"), {
    ...building,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return document.id;
}

export async function updateBuilding(
  buildingId: string,
  building: BuildingInput,
) {
  await updateDoc(doc(db, "buildings", buildingId), {
    ...building,
    updatedAt: serverTimestamp(),
  });
}
