import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
  type Timestamp,
} from "firebase/firestore";

import { db } from "../config/firestore";
import { statusDoc } from "./slotStatusService";
import { findVehicleOwner } from "./employeeVehicleService";
import { getVehicleLogDate, normalizeVehicleNumber } from "./vehicleUtils";
import type { Parking } from "../types/parking";

export { getVehicleLogDate, normalizeVehicleNumber };

const vehicleLogsCollection = collection(db, "vehicleLogs");

function activeSessionDoc(buildingId: string, logDate: string, vehicleNumber: string) {
  return doc(db, "activeVehicleSessions", `${buildingId}_${logDate}_${vehicleNumber}`);
}

export interface VehicleLog {
  id: string;
  buildingId: string;
  buildingDate: string;
  vehicleNumber: string;
  vehicleType: "CAR" | "BIKE";
  parkingArea?: keyof Parking;
  slotId?: string;
  slotNumber?: string;
  layoutId?: string;
  ownership: "REGISTERED" | "UNREGISTERED";
  employeeId?: string;
  employeeName?: string;
  logDate: string;
  loggedAt?: Timestamp;
  status?: "ACTIVE" | "EXITED" | "VOID";
  updatedAt?: Timestamp;
  lastCorrectionReason?: string;
  loggedBy: string;
  loggedByName: string;
  loggedByRole: string;
}

export async function createVehicleLog({
  buildingId,
  vehicleNumber,
  vehicleType,
  parkingArea,
  slotId,
  slotNumber,
  layoutId,
  loggedBy,
  loggedByName,
  loggedByRole,
}: {
  buildingId: string;
  vehicleNumber: string;
  vehicleType: "CAR" | "BIKE";
  parkingArea?: keyof Parking;
  slotId?: string;
  slotNumber?: string;
  layoutId?: string;
  loggedBy: string;
  loggedByName: string;
  loggedByRole: string;
}) {
  const normalizedVehicleNumber = normalizeVehicleNumber(vehicleNumber);
  if (normalizedVehicleNumber.length < 4) throw new Error("Enter a valid vehicle number.");

  const logDate = getVehicleLogDate();
  const logId = doc(vehicleLogsCollection).id;
  const vehicleLogRef = doc(db, "vehicleLogs", logId);
  const activeSessionRef = activeSessionDoc(buildingId, logDate, normalizedVehicleNumber);
  const legacyLogRef = doc(db, "vehicleLogs", `${buildingId}_${logDate}_${normalizedVehicleNumber}`);
  const owner = await findVehicleOwner(normalizedVehicleNumber, buildingId);

  await runTransaction(db, async (transaction) => {
    const [activeSession, legacyLog] = await Promise.all([
      transaction.get(activeSessionRef),
      transaction.get(legacyLogRef),
    ]);

    if (activeSession.exists() || (legacyLog.exists() && legacyLog.data()?.status === "ACTIVE")) {
      throw new Error("This vehicle is already parked for today.");
    }

    transaction.set(vehicleLogRef, {
      buildingId,
      buildingDate: `${buildingId}_${logDate}`,
      vehicleNumber: normalizedVehicleNumber,
      vehicleType,
      ...(parkingArea && { parkingArea }),
      ...(slotId && { slotId }),
      ...(slotNumber && { slotNumber }),
      ...(layoutId && { layoutId }),
      ownership: owner ? "REGISTERED" : "UNREGISTERED",
      ...(owner && { employeeId: owner.userId, employeeName: owner.employeeName }),
      logDate,
      status: "ACTIVE",
      loggedAt: serverTimestamp(),
      loggedBy,
      loggedByName,
      loggedByRole,
    });

    transaction.set(activeSessionRef, {
      buildingId,
      logDate,
      vehicleNumber: normalizedVehicleNumber,
      logId,
      createdAt: serverTimestamp(),
    });

    if (slotId && layoutId) {
      transaction.set(
        statusDoc(buildingId, layoutId),
        {
          slots: {
            [slotId]: {
              status: "OCCUPIED",
              updatedAt: serverTimestamp(),
              updatedBy: loggedBy,
              vehicleNumber: normalizedVehicleNumber,
              vehicleType,
              logId,
              ...(owner && { employeeName: owner.employeeName }),
            },
          },
        },
        { merge: true },
      );
    }
  });

  return { logId, ownership: owner ? ("REGISTERED" as const) : ("UNREGISTERED" as const), owner };
}

export async function getVehicleLogs(buildingId: string, logDate: string) {
  const snapshot = await getDocs(
    query(vehicleLogsCollection, where("buildingId", "==", buildingId), where("logDate", "==", logDate)),
  );
  return snapshot.docs
    .map((document) => ({ id: document.id, ...(document.data() as Omit<VehicleLog, "id">) }))
    .sort((first, second) => (second.loggedAt?.toMillis() ?? 0) - (first.loggedAt?.toMillis() ?? 0));
}

export async function getTodayVehicleLogs(buildingId: string) {
  return getVehicleLogs(buildingId, getVehicleLogDate());
}

export async function getActiveLogForVehicle(vehicleNumber: string, employeeId: string): Promise<VehicleLog | null> {
  const normalizedVehicleNumber = normalizeVehicleNumber(vehicleNumber);
  if (!normalizedVehicleNumber || !employeeId) return null;
  const snapshot = await getDocs(
    query(
      vehicleLogsCollection,
      where("vehicleNumber", "==", normalizedVehicleNumber),
      where("status", "==", "ACTIVE"),
      where("employeeId", "==", employeeId),
    ),
  );
  if (snapshot.empty) return null;
  const document = snapshot.docs[0];
  return { id: document.id, ...(document.data() as Omit<VehicleLog, "id">) };
}

export function subscribeToActiveLogForVehicle(
  vehicleNumber: string,
  employeeId: string,
  onChange: (log: VehicleLog | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const normalizedVehicleNumber = normalizeVehicleNumber(vehicleNumber);

  if (!normalizedVehicleNumber || !employeeId) {
    onChange(null);
    return () => undefined;
  }

  return onSnapshot(
    query(
      vehicleLogsCollection,
      where("vehicleNumber", "==", normalizedVehicleNumber),
      where("status", "==", "ACTIVE"),
      where("employeeId", "==", employeeId),
    ),
    (snapshot) => {
      if (snapshot.empty) {
        onChange(null);
        return;
      }

      const document = snapshot.docs[0];
      onChange({ id: document.id, ...(document.data() as Omit<VehicleLog, "id">) });
    },
    onError,
  );
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
    transaction.update(logRef, { parkingArea, lastCorrectionReason: reason.trim(), updatedAt: serverTimestamp() });
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

async function finishVehicleLog(
  logId: string,
  correctedBy: string,
  status: "EXITED" | "VOID",
  reason?: string,
) {
  const logRef = doc(db, "vehicleLogs", logId);
  const auditRef = doc(collection(logRef, "audit"));

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(logRef);
    if (!snapshot.exists()) throw new Error("Vehicle log not found.");
    if (status === "EXITED" && snapshot.data().status !== "ACTIVE") {
      throw new Error("Only active vehicle logs can be marked as exited.");
    }
    if (status === "VOID" && snapshot.data().status === "VOID") {
      throw new Error("This log is already voided.");
    }

    const data = snapshot.data();
    const activeSessionRef = activeSessionDoc(data.buildingId, data.logDate, normalizeVehicleNumber(data.vehicleNumber));
    const activeSession = snapshot.data().status === "ACTIVE" ? await transaction.get(activeSessionRef) : null;
    const timestampFields =
      status === "EXITED"
        ? { exitedBy: correctedBy, exitedAt: serverTimestamp() }
        : { voidReason: reason?.trim(), voidedBy: correctedBy, voidedAt: serverTimestamp() };

    transaction.update(logRef, { status, ...timestampFields, updatedAt: serverTimestamp() });
    transaction.set(auditRef, {
      action: status === "VOID" ? "VOIDED" : "EXITED",
      ...(reason && { reason: reason.trim() }),
      correctedBy,
      createdAt: serverTimestamp(),
    });

    if (activeSession?.exists() && activeSession.data().logId === logId) transaction.delete(activeSessionRef);

    if (data.slotId && data.layoutId) {
      transaction.set(
        statusDoc(data.buildingId, data.layoutId),
        {
          slots: {
            [data.slotId]: {
              status: "AVAILABLE",
              updatedAt: serverTimestamp(),
              updatedBy: correctedBy,
              vehicleNumber: null,
              vehicleType: null,
              logId: null,
              employeeName: null,
            },
          },
        },
        { merge: true },
      );
    }
  });
}

export async function voidVehicleLog({ logId, reason, correctedBy }: { logId: string; reason: string; correctedBy: string }) {
  await finishVehicleLog(logId, correctedBy, "VOID", reason);
}

export async function exitVehicleLog({ logId, correctedBy }: { logId: string; correctedBy: string }) {
  await finishVehicleLog(logId, correctedBy, "EXITED");
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