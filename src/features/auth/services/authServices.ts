import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { ROUTES } from "../../../app/routes";
import { auth } from "../../../config/firebase";
import { db } from "../../../config/firestore";
import type { UserRole } from "../../../types/common";

const userRoles: UserRole[] = ["EMPLOYEE", "SECURITY", "ADMIN", "DEVELOPER"];

export interface AuthUser {
  uid: string;
  email: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  buildingId: string;
  active: boolean;
}

function toAuthUser(uid: string, data: Record<string, unknown>): AuthUser | null {
  const role = data.role;

  if (typeof role !== "string" || !userRoles.includes(role as UserRole)) {
    return null;
  }

  return {
    uid,
    email: typeof data.email === "string" ? data.email : "",
    employeeId: typeof data.employeeId === "string" ? data.employeeId : "",
    firstName: typeof data.firstName === "string" ? data.firstName : "",
    lastName: typeof data.lastName === "string" ? data.lastName : "",
    role: role as UserRole,
    buildingId: typeof data.buildingId === "string" ? data.buildingId : "",
    active: data.active === true,
  };
}

export async function getAuthUser(uid: string) {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) return null;

  return toAuthUser(uid, snapshot.data());
}

export async function login(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const user = await getAuthUser(credential.user.uid);

  if (!user || !user.active) {
    await signOut(auth);
    throw new Error("Your account is inactive or has not been configured.");
  }

  return user;
}

export async function logout() {
  await signOut(auth);
}

export function getDashboardRoute(role: UserRole) {
  switch (role) {
    case "SECURITY":
      return ROUTES.SECURITY;
    case "ADMIN":
      return ROUTES.ADMIN;
    case "DEVELOPER":
      return ROUTES.DEVELOPER;
    default:
      return ROUTES.EMPLOYEE;
  }
}
