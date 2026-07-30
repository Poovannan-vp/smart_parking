import "dotenv/config";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

type UserRole = "EMPLOYEE" | "SECURITY" | "ADMIN" | "DEVELOPER";

interface BootstrapUser {
  uid?: string;
  email: string;
  password: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  buildingId: string;
}

function getCredential() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccount) {
    return cert(JSON.parse(serviceAccount));
  }

  return applicationDefault();
}

const adminApp = getApps()[0] ?? initializeApp({
  credential: getCredential(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});
const auth = getAuth(adminApp);
const db = getFirestore(adminApp);

const users: BootstrapUser[] = [
  {
    uid: process.env.BOOTSTRAP_ADMIN_UID,
    email: process.env.BOOTSTRAP_ADMIN_EMAIL ?? "",
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "",
    employeeId: process.env.BOOTSTRAP_ADMIN_EMPLOYEE_ID ?? "ADM001",
    firstName: process.env.BOOTSTRAP_ADMIN_FIRST_NAME ?? "Admin",
    lastName: process.env.BOOTSTRAP_ADMIN_LAST_NAME ?? "User",
    role: "ADMIN",
    buildingId: process.env.BOOTSTRAP_ADMIN_BUILDING_ID ?? "",
  },
];

async function createOrUpdateUser(user: BootstrapUser) {
  let authUser;

  if (user.uid) {
    authUser = await auth.getUser(user.uid);

    if (!authUser.email) {
      if (!user.email || !user.password) {
        throw new Error(
          "This existing Auth UID has no email sign-in. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD to enable Email/Password login for it.",
        );
      }

      authUser = await auth.updateUser(user.uid, {
        email: user.email,
        password: user.password,
        displayName: `${user.firstName} ${user.lastName}`.trim(),
      });
    }
  } else {
    if (!user.email || !user.password) {
      throw new Error("Set BOOTSTRAP_ADMIN_UID or provide both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD.");
    }

    try {
      authUser = await auth.getUserByEmail(user.email);
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") {
        throw error;
      }

      authUser = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: `${user.firstName} ${user.lastName}`.trim(),
      });
    }
  }

  await db.collection("users").doc(authUser.uid).set(
    {
      email: authUser.email ?? user.email,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      buildingId: user.buildingId,
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`Configured ${user.role} user: ${user.email} (${authUser.uid})`);
}

async function bootstrapUsers() {
  for (const user of users) {
    await createOrUpdateUser(user);
  }

  console.log("User bootstrap completed.");
}

bootstrapUsers().catch((error) => {
  console.error("User bootstrap failed:", error);
  process.exitCode = 1;
});
