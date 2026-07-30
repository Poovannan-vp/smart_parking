# Authentication setup

The application uses Firebase Email/Password authentication and a Firestore user profile to determine the user's role.

## 1. Enable sign-in

In Firebase Console, open **Authentication** → **Sign-in method** and enable **Email/Password**.

## 2. Create accounts

Create each user in Firebase Authentication and copy the generated UID.

## 3. Create the matching Firestore profile

Create a document at `users/{UID}` for every Firebase Authentication user.

```json
{
  "email": "security@company.com",
  "employeeId": "SEC001",
  "firstName": "Asha",
  "lastName": "Kumar",
  "role": "SECURITY",
  "buildingId": "chennai-kg",
  "active": true
}
```

Allowed roles are `EMPLOYEE`, `SECURITY`, `ADMIN`, and `DEVELOPER`.

The UID must be the document ID. Users without this document, an allowed role, or `active: true` are signed out and cannot access a dashboard.

## 4. Deploy Firestore rules

The project rules are in `firestore.rules`. Deploy them through Firebase Console or Firebase CLI after creating the first administrator profile in Firebase Console.

The first administrator must have `role: "ADMIN"`. Firestore Console writes bypass rules, so it can create this initial profile safely.

## Automated bootstrap (recommended)

Instead of manually creating the first user, copy `.env.example` to `.env` and fill in the Admin SDK values and `BOOTSTRAP_ADMIN_*` fields. Then run:

```powershell
npm run bootstrap:users
```

The script creates the Firebase Authentication account when it does not already exist and creates or updates the matching `users/{uid}` profile with the `ADMIN` role.

If the account already exists in Firebase Authentication, set `BOOTSTRAP_ADMIN_UID` to its UID. The script will use that existing account and does not require an email or password for it.

`vehicleLogs` needs no separate bootstrap. Cloud Firestore creates that collection automatically when Security saves the first real vehicle log; creating an empty collection would require a fake log document, which this project deliberately avoids.
