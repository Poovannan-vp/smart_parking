import type { BaseEntity, UserRole } from "./common";

export interface User extends BaseEntity {
  employeeId: string;

  firstName: string;

  lastName: string;

  email: string;

  phone: string;

  role: UserRole;

  buildingId: string;

  active: boolean;
}