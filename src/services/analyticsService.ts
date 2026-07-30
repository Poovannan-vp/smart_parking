import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../config/firestore";
import type { Building } from "../types/building";
import type { VehicleLog } from "./vehicleLogService";

export interface AdminAnalytics {
  buildingCount: number;
  totalCapacity: number;
  totalOccupied: number;
  vehicleEntries: number;
  activeVehicles: number;
  exitedVehicles: number;
  voidedVehicles: number;
  logs: VehicleLog[];
}

export async function getAdminAnalytics(logDate: string): Promise<AdminAnalytics> {
  const [buildingSnapshot, logSnapshot] = await Promise.all([
    getDocs(collection(db, "buildings")),
    getDocs(query(collection(db, "vehicleLogs"), where("logDate", "==", logDate))),
  ]);

  let totalCapacity = 0;
  let totalOccupied = 0;

  buildingSnapshot.docs.forEach((document) => {
    const building = document.data() as Building;
    Object.values(building.parking ?? {}).forEach((area) => {
      if (!area) return;
      totalCapacity += area.capacity;
      totalOccupied += area.occupied;
    });
  });

  const logs = logSnapshot.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Omit<VehicleLog, "id">),
  }));

  return {
    buildingCount: buildingSnapshot.size,
    totalCapacity,
    totalOccupied,
    vehicleEntries: logs.length,
    activeVehicles: logs.filter((log) => (log.status ?? "ACTIVE") === "ACTIVE").length,
    exitedVehicles: logs.filter((log) => log.status === "EXITED").length,
    voidedVehicles: logs.filter((log) => log.status === "VOID").length,
    logs,
  };
}
