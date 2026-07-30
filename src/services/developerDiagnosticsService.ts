import { collection, collectionGroup, getDocs, limit, query } from "firebase/firestore";

import { db } from "../config/firestore";
import type { Building } from "../types/building";
import type { Parking } from "../types/parking";

export interface DiagnosticIssue {
  id: string;
  severity: "error" | "warning";
  title: string;
  detail: string;
}

export interface DeveloperDiagnostics {
  buildingCount: number;
  parkingAreaCount: number;
  vehicleLogCount: number;
  issues: DiagnosticIssue[];
  recentAudits: Array<{ id: string; action?: string; reason?: string; correctedBy?: string }>;
}

export async function getDeveloperDiagnostics(): Promise<DeveloperDiagnostics> {
  const [buildingSnapshot, vehicleLogSnapshot, auditSnapshot] = await Promise.all([
    getDocs(collection(db, "buildings")),
    getDocs(collection(db, "vehicleLogs")),
    getDocs(query(collectionGroup(db, "audit"), limit(20))),
  ]);
  const issues: DiagnosticIssue[] = [];
  let parkingAreaCount = 0;

  for (const document of buildingSnapshot.docs) {
    const building = document.data() as Building;
    const buildingName = building.name || document.id;
    const parkingAreas = Object.entries(building.parking ?? {}) as Array<
      [keyof Parking, Parking[keyof Parking]]
    >;

    if (!building.name || !building.city) {
      issues.push({
        id: `${document.id}-building-details`,
        severity: "warning",
        title: "Incomplete building details",
        detail: `${buildingName} is missing a building name or city.`,
      });
    }

    if (parkingAreas.length === 0) {
      issues.push({
        id: `${document.id}-parking`,
        severity: "error",
        title: "No parking areas configured",
        detail: `${buildingName} has no parking configuration.`,
      });
    }

    for (const [areaName, area] of parkingAreas) {
      if (!area) continue;

      parkingAreaCount += 1;

      if (area.capacity < 0 || area.occupied < 0) {
        issues.push({
          id: `${document.id}-${areaName}-negative`,
          severity: "error",
          title: "Negative parking value",
          detail: `${buildingName} / ${areaName} has a negative capacity or occupancy.`,
        });
      }

      if (area.occupied > area.capacity) {
        issues.push({
          id: `${document.id}-${areaName}-overflow`,
          severity: "error",
          title: "Occupancy exceeds capacity",
          detail: `${buildingName} / ${areaName} has ${area.occupied} occupied spaces but capacity is ${area.capacity}.`,
        });
      }
    }
  }

  for (const document of vehicleLogSnapshot.docs) {
    const log = document.data() as Record<string, unknown>;

    if (!log.buildingId || !log.logDate || !log.vehicleNumber) {
      issues.push({
        id: `${document.id}-vehicle-log`,
        severity: "warning",
        title: "Incomplete vehicle log",
        detail: `Vehicle log ${document.id} is missing its building, date, or vehicle number.`,
      });
    }
  }

  return {
    buildingCount: buildingSnapshot.size,
    parkingAreaCount,
    vehicleLogCount: vehicleLogSnapshot.size,
    issues,
    recentAudits: auditSnapshot.docs.map((document) => ({
      id: document.id,
      ...(document.data() as { action?: string; reason?: string; correctedBy?: string }),
    })),
  };
}
