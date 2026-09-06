import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

const auth = getAuth();
const db = getFirestore();

interface SetUserPasswordRequest {
  targetUid: string;
  newPassword: string;
}

/**
 * Lets an Admin (or Developer, matching every other admin-scoped route in
 * this app) set another user's password directly, instead of only being
 * able to email a reset link. The client Firebase SDK can never do this on
 * its own - changing someone else's password requires the Admin SDK, which
 * only a trusted server context (this function) may hold. The caller's
 * role is verified here from Firestore, not trusted from the client.
 */
export const setUserPassword = onCall<SetUserPasswordRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const callerSnap = await db.collection("users").doc(request.auth.uid).get();
  const callerRole = callerSnap.data()?.role;

  if (callerRole !== "ADMIN" && callerRole !== "DEVELOPER") {
    throw new HttpsError("permission-denied", "Only Admins can set another user's password.");
  }

  const { targetUid, newPassword } = request.data ?? {};

  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError("invalid-argument", "targetUid is required.");
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    throw new HttpsError("invalid-argument", "newPassword must be at least 8 characters.");
  }

  await auth.updateUser(targetUid, { password: newPassword });

  return { success: true };
});
