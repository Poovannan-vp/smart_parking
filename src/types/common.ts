export type UserRole =
  | "EMPLOYEE"
  | "SECURITY"
  | "ADMIN"
  | "DEVELOPER";

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}