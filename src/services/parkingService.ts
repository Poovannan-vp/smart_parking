import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../config/firestore";
import type { Parking } from "../types/parking";

function getParkingDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value;

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

export async function getParking(buildingId: string): Promise<Parking | null> {
  const documentRef = doc(db, "buildings", buildingId);

  const snapshot = await getDoc(documentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data().parking as Parking;
}

export async function changeParkingOccupancy(
  buildingId: string,
  area: keyof Parking,
  change: 1 | -1,
) {
  const documentRef = doc(db, "buildings", buildingId);
  const date = getParkingDate();
  const dailyParkingRef = doc(
    db,
    "buildings",
    buildingId,
    "dailyParking",
    date,
  );

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(documentRef);

    if (!snapshot.exists()) {
      throw new Error("Building not found.");
    }

    const parking = snapshot.data().parking as Parking;
    const parkingArea = parking[area];

    if (!parkingArea) {
      throw new Error("Parking area not found.");
    }

    const occupied = parkingArea.occupied + change;

    if (occupied < 0 || occupied > parkingArea.capacity) {
      throw new Error("Parking occupancy must be between zero and capacity.");
    }

    const dailySnapshot = await transaction.get(dailyParkingRef);
    const updatedParking: Parking = {
      ...parking,
      [area]: {
        ...parkingArea,
        occupied,
      },
    };

    transaction.update(documentRef, {
      parking: updatedParking,
      updatedAt: serverTimestamp(),
    });

    const dailyParkingData = {
      buildingId,
      date,
      parking: updatedParking,
      updatedAt: serverTimestamp(),
    };

    if (dailySnapshot.exists()) {
      transaction.set(dailyParkingRef, dailyParkingData, { merge: true });
    } else {
      transaction.set(dailyParkingRef, {
        ...dailyParkingData,
        createdAt: serverTimestamp(),
      });
    }
  });
}
