import {
  collection,
  getDocs,
  doc,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../config/firestore";
import type { Building } from "../types/building";

export interface BuildingOption {
  id: string;
  name: string;
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
  callback: (building: Building | null) => void
) {
  const documentRef = doc(db, "buildings", buildingId);

  return onSnapshot(documentRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback(snapshot.data() as Building);
  });
}