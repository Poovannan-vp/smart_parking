import { createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, userManagementAuth } from "../config/firebase";
import { db } from "../config/firestore";
import type { UserRole } from "../types/common";

export interface ManagedUser {
  id: string;
  email: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  buildingId: string;
  active: boolean;
}

export interface NewManagedUser extends Omit<ManagedUser, "id" | "active"> {
  password: string;
}

export async function getManagedUsers(): Promise<ManagedUser[]> {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs
    .map((document) => ({ id: document.id, ...(document.data() as Omit<ManagedUser, "id">) }))
    .sort((first, second) => first.email.localeCompare(second.email));
}

export async function createManagedUser(user: NewManagedUser) {
  const credential = await createUserWithEmailAndPassword(
    userManagementAuth,
    user.email.trim().toLowerCase(),
    user.password,
  );

  try {
    await setDoc(doc(db, "users", credential.user.uid), {
      email: user.email.trim().toLowerCase(),
      employeeId: user.employeeId.trim(),
      firstName: user.firstName.trim(),
      lastName: user.lastName.trim(),
      role: user.role,
      buildingId: user.buildingId,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } finally {
    await signOut(userManagementAuth);
  }
}

export async function setManagedUserActive(userId: string, active: boolean) {
  await updateDoc(doc(db, "users", userId), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function updateManagedUser(
  userId: string,
  user: Pick<ManagedUser, "employeeId" | "firstName" | "lastName" | "role" | "buildingId">,
) {
  await updateDoc(doc(db, "users", userId), {
    ...user,
    updatedAt: serverTimestamp(),
  });
}

export async function sendManagedUserPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}
