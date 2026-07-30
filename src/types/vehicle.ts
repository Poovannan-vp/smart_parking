import type { BaseEntity } from "./common";

export interface Vehicle extends BaseEntity {
  userId: string;

  registrationNumber: string;

  vehicleType: "CAR" | "BIKE";

  brand: string;

  model: string;

  color: string;
}