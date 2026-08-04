import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";

import { db } from "../config/firestore";
import { normalizeVehicleNumber } from "./vehicleLogService";

export interface EmployeeVehicle { id: string; registrationNumber: string; vehicleType: "CAR" | "BIKE"; }

export async function getEmployeeVehicles(userId: string): Promise<EmployeeVehicle[]> {
  const snapshot = await getDocs(query(collection(db, "employeeVehicles"), where("userId", "==", userId)));
  return snapshot.docs.map((document) => ({ id: document.id, ...(document.data() as Omit<EmployeeVehicle, "id">) }));
}

export async function registerEmployeeVehicle(userId: string, registrationNumber: string, vehicleType: "CAR" | "BIKE") {
  const normalizedNumber = normalizeVehicleNumber(registrationNumber);
  if (normalizedNumber.length < 4) throw new Error("Enter a valid vehicle number.");
  await addDoc(collection(db, "employeeVehicles"), { userId, registrationNumber: normalizedNumber, vehicleType, createdAt: serverTimestamp() });
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
