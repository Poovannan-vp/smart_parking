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
import { statusDoc } from "./slotStatusService";
import { findVehicleOwner } from "./employeeVehicleService";
import { getVehicleLogDate, normalizeVehicleNumber } from "./vehicleUtils";
import type { Parking } from "../types/parking";

export { getVehicleLogDate, normalizeVehicleNumber };

const vehicleLogsCollection = collection(db, "vehicleLogs");

export interface VehicleLog {
  id: string;
  buildingId: string;
  buildingDate: string;
  vehicleNumber: string;
  vehicleType: "CAR" | "BIKE";
  parkingArea?: keyof Parking;
  /** The specific trackable slot this vehicle occupies, when logged from the layout map rather than the plain gate-log form. */
  slotId?: string;
  /** The slot's display label (ParkingSlot.slotNumber) at the moment of logging - slotId is only a stable internal key, never shown to a user directly. */
  slotNumber?: string;
  layoutId?: string;
  /** Whether the plate matched a registration in `employeeVehicles` at the moment of logging. */
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

  if (normalizedVehicleNumber.length < 4) {
    throw new Error("Enter a valid vehicle number.");
  }

  const logDate = getVehicleLogDate();
  const logId = `${buildingId}_${logDate}_${normalizedVehicleNumber}`;
  const vehicleLogRef = doc(db, "vehicleLogs", logId);

  // Queries can't run inside a Firestore transaction against an arbitrary
  // filter (only direct doc gets can), so the ownership lookup happens
  // before the transaction opens; the transaction itself only touches the
  // two documents (log + slot status) that must change atomically together.
  const owner = await findVehicleOwner(normalizedVehicleNumber, buildingId);

  try {
    await runTransaction(db, async (transaction) => {
      const existingLog = await transaction.get(vehicleLogRef);

      if (existingLog.exists()) {
        throw new Error("This vehicle is already logged for today.");
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
  } catch (error) {
    console.error("Create Vehicle Log Error:", error);
    throw error;
  }

  return { logId, ownership: owner ? ("REGISTERED" as const) : ("UNREGISTERED" as const), owner };
}

export async function getVehicleLogs(
  buildingId: string,
  logDate: string,
) {
  const logsQuery = query(
    vehicleLogsCollection,
    where("buildingId", "==", buildingId),
    where("logDate", "==", logDate),
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

/**
 * The employee dashboard's "where is my vehicle parked" lookup - the one
 * currently-ACTIVE log (if any) for a plate the caller owns.
 *
 * Firestore can't validate a `list` query's security rule against a field
 * that isn't also one of the query's own equality filters - it rejects the
 * whole query rather than filtering per document (the same reason
 * employeeVehicles reads only work because getEmployeeVehicles always
 * filters by userId). The vehicleLogs read rule allows a signed-in user to
 * read a log whose employeeId matches their own uid, so that filter must be
 * part of this query too, not just checked after the fact.
 */
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

    const data = snapshot.data();

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

    const data = snapshot.data();

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

    // Keep the slot map in sync: a vehicle logged from the layout map always
    // carries its slotId/layoutId, so exiting it here frees the same slot
    // that createVehicleLog marked OCCUPIED - one action, two documents,
    // same transaction as creation used.
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
