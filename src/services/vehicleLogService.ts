import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Timestamp,
} from "firebase/firestore";

import { db } from "../config/firestore";
import type { Parking } from "../types/parking";

const vehicleLogsCollection = collection(db, "vehicleLogs");

export interface VehicleLog {
  id: string;
  buildingId: string;
  buildingDate: string;
  vehicleNumber: string;
  parkingArea?: keyof Parking;
  logDate: string;
  loggedAt?: Timestamp;
  status?: "ACTIVE" | "EXITED" | "VOID";
  updatedAt?: Timestamp;
  lastCorrectionReason?: string;
}

export function getVehicleLogDate() {
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

export function normalizeVehicleNumber(vehicleNumber: string) {
  return vehicleNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function createVehicleLog({
  buildingId,
  vehicleNumber,
  parkingArea,
}: {
  buildingId: string;
  vehicleNumber: string;
  parkingArea?: keyof Parking;
}) {
  const normalizedVehicleNumber = normalizeVehicleNumber(vehicleNumber);

  if (normalizedVehicleNumber.length < 4) {
    throw new Error("Enter a valid vehicle number.");
  }

  const logDate = getVehicleLogDate();
  const logId = `${buildingId}_${logDate}_${normalizedVehicleNumber}`;
  const vehicleLogRef = doc(db, "vehicleLogs", logId);

  await runTransaction(db, async (transaction) => {
    const existingLog = await transaction.get(vehicleLogRef);

    if (existingLog.exists()) {
      throw new Error("This vehicle is already logged for today.");
    }

    transaction.set(vehicleLogRef, {
      buildingId,
      buildingDate: `${buildingId}_${logDate}`,
      vehicleNumber: normalizedVehicleNumber,
      ...(parkingArea && { parkingArea }),
      logDate,
      status: "ACTIVE",
      loggedAt: serverTimestamp(),
    });
  });
}

export async function getVehicleLogs(buildingId: string, logDate: string) {
  const buildingDate = `${buildingId}_${logDate}`;
  const logsQuery = query(
    vehicleLogsCollection,
    where("buildingDate", "==", buildingDate),
  );
  const snapshot = await getDocs(logsQuery);

  return snapshot.docs
    .map((document) => ({
      id: document.id,
      ...(document.data() as Omit<VehicleLog, "id">),
    }))
    .sort(
      (first, second) =>
        (second.loggedAt?.toMillis() ?? 0) -
        (first.loggedAt?.toMillis() ?? 0),
    );
}

export async function getTodayVehicleLogs(buildingId: string) {
  return getVehicleLogs(buildingId, getVehicleLogDate());
}

export async function correctVehicleLog({
  logId,
  parkingArea,
  reason,
  correctedBy,
}: {
  logId: string;
  parkingArea: keyof Parking;
  reason: string;
  correctedBy: string;
}) {
  const logRef = doc(db, "vehicleLogs", logId);
  const auditRef = doc(collection(logRef, "audit"));

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(logRef);

    if (!snapshot.exists()) throw new Error("Vehicle log not found.");
    if (snapshot.data().status === "VOID") throw new Error("A voided log cannot be corrected.");

    transaction.update(logRef, {
      parkingArea,
      lastCorrectionReason: reason.trim(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditRef, {
      action: "CORRECTED",
      reason: reason.trim(),
      correctedBy,
      previousParkingArea: snapshot.data().parkingArea ?? null,
      parkingArea,
      createdAt: serverTimestamp(),
    });
  });
}

export async function voidVehicleLog({
  logId,
  reason,
  correctedBy,
}: {
  logId: string;
  reason: string;
  correctedBy: string;
}) {
  const logRef = doc(db, "vehicleLogs", logId);
  const auditRef = doc(collection(logRef, "audit"));

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(logRef);

    if (!snapshot.exists()) throw new Error("Vehicle log not found.");
    if (snapshot.data().status === "VOID") throw new Error("This log is already voided.");

    transaction.update(logRef, {
      status: "VOID",
      voidReason: reason.trim(),
      voidedBy: correctedBy,
      voidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditRef, {
      action: "VOIDED",
      reason: reason.trim(),
      correctedBy,
      createdAt: serverTimestamp(),
    });
  });
}

export async function exitVehicleLog({
  logId,
  correctedBy,
}: {
  logId: string;
  correctedBy: string;
}) {
  const logRef = doc(db, "vehicleLogs", logId);
  const auditRef = doc(collection(logRef, "audit"));

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(logRef);

    if (!snapshot.exists()) throw new Error("Vehicle log not found.");
    if (snapshot.data().status !== "ACTIVE") throw new Error("Only active vehicle logs can be marked as exited.");

    transaction.update(logRef, {
      status: "EXITED",
      exitedBy: correctedBy,
      exitedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditRef, {
      action: "EXITED",
      correctedBy,
      createdAt: serverTimestamp(),
    });
  });
}

export interface VehicleLogAudit {
  id: string;
  action: "CORRECTED" | "VOIDED" | "EXITED";
  reason?: string;
  correctedBy: string;
  createdAt?: Timestamp;
}

export async function getVehicleLogAudit(logId: string): Promise<VehicleLogAudit[]> {
  const snapshot = await getDocs(collection(db, "vehicleLogs", logId, "audit"));

  return snapshot.docs
    .map((document) => ({ id: document.id, ...(document.data() as Omit<VehicleLogAudit, "id">) }))
    .sort((first, second) => (second.createdAt?.toMillis() ?? 0) - (first.createdAt?.toMillis() ?? 0));
}
