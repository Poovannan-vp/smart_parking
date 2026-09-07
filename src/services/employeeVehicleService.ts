import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";

import { db } from "../config/firestore";
import { normalizeVehicleNumber } from "./vehicleUtils";

export interface EmployeeVehicle {
  id: string;
  userId: string;
  /** Location snapshot added for building-scoped security lookups. Legacy records may not have it. */
  buildingId?: string;
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
  buildingId: string;
}

export async function getEmployeeVehicles(userId: string): Promise<EmployeeVehicle[]> {
  const snapshot = await getDocs(query(collection(db, "employeeVehicles"), where("userId", "==", userId)));
  return snapshot.docs.map((document) => ({ id: document.id, ...(document.data() as Omit<EmployeeVehicle, "id">) }));
}

export async function registerEmployeeVehicle(
  userId: string,
  buildingId: string,
  registrationNumber: string,
  vehicleType: "CAR" | "BIKE",
  employeeName: string,
) {
  const normalizedNumber = normalizeVehicleNumber(registrationNumber);
  if (normalizedNumber.length < 4) throw new Error("Enter a valid vehicle number.");
  await addDoc(collection(db, "employeeVehicles"), {
    userId,
    buildingId,
    registrationNumber: normalizedNumber,
    vehicleType,
    employeeName,
    createdAt: serverTimestamp(),
  });
}

export async function updateEmployeeVehicle(
  vehicleId: string,
  buildingId: string,
  registrationNumber: string,
  vehicleType: "CAR" | "BIKE",
) {
  const normalizedNumber = normalizeVehicleNumber(registrationNumber);
  if (normalizedNumber.length < 4) throw new Error("Enter a valid vehicle number.");
  await updateDoc(doc(db, "employeeVehicles", vehicleId), {
    buildingId,
    registrationNumber: normalizedNumber,
    vehicleType,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEmployeeVehicle(vehicleId: string) {
  await deleteDoc(doc(db, "employeeVehicles", vehicleId));
}

/**
 * The registered-vehicle directory for one building, used by Security's
 * gate-entry typeahead. The building snapshot is sourced from the employee's
 * assigned user record when the vehicle is registered.
 */
export async function getVehicleDirectory(buildingId: string): Promise<VehicleDirectoryEntry[]> {
  const snapshot = await getDocs(
    query(collection(db, "employeeVehicles"), where("buildingId", "==", buildingId)),
  );
  return snapshot.docs.map((document) => {
    const data = document.data() as Omit<EmployeeVehicle, "id">;
    return {
      registrationNumber: data.registrationNumber,
      vehicleType: data.vehicleType,
      userId: data.userId,
      employeeName: data.employeeName || "Unnamed employee",
      buildingId: data.buildingId!,
    };
  });
}

/** A single plate lookup, used when Security logs a vehicle to decide REGISTERED vs UNREGISTERED. */
export async function findVehicleOwner(registrationNumber: string, buildingId: string): Promise<VehicleDirectoryEntry | null> {
  const normalizedNumber = normalizeVehicleNumber(registrationNumber);
  const snapshot = await getDocs(
    query(
      collection(db, "employeeVehicles"),
      where("registrationNumber", "==", normalizedNumber),
      where("buildingId", "==", buildingId),
    ),
  );

  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data() as Omit<EmployeeVehicle, "id">;
  return {
    registrationNumber: data.registrationNumber,
    vehicleType: data.vehicleType,
    userId: data.userId,
    employeeName: data.employeeName || "Unnamed employee",
    buildingId: data.buildingId!,
  };
}
