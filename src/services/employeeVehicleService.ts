import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";

import { db } from "../config/firestore";
import { normalizeVehicleNumber } from "./vehicleUtils";

export interface EmployeeVehicle {
  id: string;
  userId: string;
  registrationNumber: string;
  vehicleType: "CAR" | "BIKE";
  /** Snapshot of the owner's display name at registration time, so a lookup by plate (e.g. Security logging a gate entry) never needs a second read of `users/{uid}`. */
  employeeName?: string;
}

/** One directory row used for the gate-entry "existing vehicles" lookup/typeahead. */
export interface VehicleDirectoryEntry {
  registrationNumber: string;
  vehicleType: "CAR" | "BIKE";
  userId: string;
  employeeName: string;
}

export async function getEmployeeVehicles(userId: string): Promise<EmployeeVehicle[]> {
  const snapshot = await getDocs(query(collection(db, "employeeVehicles"), where("userId", "==", userId)));
  return snapshot.docs.map((document) => ({ id: document.id, ...(document.data() as Omit<EmployeeVehicle, "id">) }));
}

export async function registerEmployeeVehicle(
  userId: string,
  registrationNumber: string,
  vehicleType: "CAR" | "BIKE",
  employeeName: string,
) {
  const normalizedNumber = normalizeVehicleNumber(registrationNumber);
  if (normalizedNumber.length < 4) throw new Error("Enter a valid vehicle number.");
  await addDoc(collection(db, "employeeVehicles"), {
    userId,
    registrationNumber: normalizedNumber,
    vehicleType,
    employeeName,
    createdAt: serverTimestamp(),
  });
}

export async function updateEmployeeVehicle(vehicleId: string, registrationNumber: string, vehicleType: "CAR" | "BIKE") {
  const normalizedNumber = normalizeVehicleNumber(registrationNumber);
  if (normalizedNumber.length < 4) throw new Error("Enter a valid vehicle number.");
  await updateDoc(doc(db, "employeeVehicles", vehicleId), {
    registrationNumber: normalizedNumber,
    vehicleType,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEmployeeVehicle(vehicleId: string) {
  await deleteDoc(doc(db, "employeeVehicles", vehicleId));
}

/**
 * The full registered-vehicle directory, for Security's gate-entry typeahead.
 * The dataset is company-wide vehicle registrations, not per-building, so
 * there is no server-side filter to apply here - callers filter client-side
 * as the user types. Kept as its own read (rather than folded into a
 * per-keystroke query) because the collection is expected to stay small.
 */
export async function getVehicleDirectory(): Promise<VehicleDirectoryEntry[]> {
  const snapshot = await getDocs(collection(db, "employeeVehicles"));
  return snapshot.docs.map((document) => {
    const data = document.data() as Omit<EmployeeVehicle, "id">;
    return {
      registrationNumber: data.registrationNumber,
      vehicleType: data.vehicleType,
      userId: data.userId,
      employeeName: data.employeeName || "Unnamed employee",
    };
  });
}

/** A single plate lookup, used when Security logs a vehicle to decide REGISTERED vs UNREGISTERED. */
export async function findVehicleOwner(registrationNumber: string): Promise<VehicleDirectoryEntry | null> {
  const normalizedNumber = normalizeVehicleNumber(registrationNumber);
  const snapshot = await getDocs(
    query(collection(db, "employeeVehicles"), where("registrationNumber", "==", normalizedNumber)),
  );

  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data() as Omit<EmployeeVehicle, "id">;
  return {
    registrationNumber: data.registrationNumber,
    vehicleType: data.vehicleType,
    userId: data.userId,
    employeeName: data.employeeName || "Unnamed employee",
  };
}
