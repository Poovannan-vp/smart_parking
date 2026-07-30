import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../config/firestore";
import type { Parking } from "../types/parking";

export async function getParking(buildingId: string): Promise<Parking | null> {
  const documentRef = doc(db, "buildings", buildingId);

  const snapshot = await getDoc(documentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data().parking as Parking;
}

export async function updateParking(
  buildingId: string,
  parking: Parking
) {
  const documentRef = doc(db, "buildings", buildingId);

  await updateDoc(documentRef, {
    parking,
  });
}