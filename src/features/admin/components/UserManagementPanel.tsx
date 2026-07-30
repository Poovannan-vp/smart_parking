import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import {
  createManagedUser,
  getManagedUsers,
  sendManagedUserPasswordReset,
  setManagedUserActive,
  updateManagedUser,
  type ManagedUser,
  type NewManagedUser,
} from "../../../services/userService";
import type { BuildingOption } from "../../../services/buildingService";
import type { UserRole } from "../../../types/common";

const roles: UserRole[] = ["EMPLOYEE", "SECURITY", "ADMIN", "DEVELOPER"];

const emptyUser: NewManagedUser = {
  email: "",
  password: "",
  employeeId: "",
  firstName: "",
  lastName: "",
  role: "EMPLOYEE",
  buildingId: "",
};

export default function UserManagementPanel({ buildings }: { buildings: BuildingOption[] }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [draft, setDraft] = useState<NewManagedUser>(emptyUser);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);

  async function loadUsers() {
    setLoading(true);

    try {
      setUsers(await getManagedUsers());
    } catch {
      setError("Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (draft.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setSaving(true);

    try {
      await createManagedUser(draft);
      setDraft(emptyUser);
      await loadUsers();
      setSuccess("User account created and role assigned.");
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Unable to create user account.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleUser(user: ManagedUser) {
    setError(null);

    try {
      await setManagedUserActive(user.id, !user.active);
      await loadUsers();
    } catch {
      setError("Unable to update user status.");
    }
  }

  async function saveUserEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;

    try {
      await updateManagedUser(editingUser.id, editingUser);
      setEditingUser(null);
      await loadUsers();
      setSuccess("User details updated.");
    } catch {
      setError("Unable to update user details.");
    }
  }

  async function resetPassword(email: string) {
    try {
      await sendManagedUserPasswordReset(email);
      setSuccess(`Password reset email sent to ${email}.`);
    } catch {
      setError("Unable to send the password reset email.");
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <form className="space-y-4 rounded-xl bg-white p-5 shadow" onSubmit={handleSubmit}>
        <div>
          <h2 className="text-lg font-semibold">Create User</h2>
          <p className="mt-1 text-sm text-slate-500">Create a Firebase login and assign its application role.</p>
        </div>

        <Input id="userEmail" type="email" label="Email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} required />
        <Input id="userPassword" type="password" label="Temporary Password" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} required />
        <Input id="employeeId" label="Employee ID" value={draft.employeeId} onChange={(event) => setDraft((current) => ({ ...current, employeeId: event.target.value }))} required />
        <div className="grid grid-cols-2 gap-3">
          <Input id="firstName" label="First Name" value={draft.firstName} onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))} required />
          <Input id="lastName" label="Last Name" value={draft.lastName} onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))} required />
        </div>

        <SelectField label="Role" id="userRole" value={draft.role} onChange={(value) => setDraft((current) => ({ ...current, role: value as UserRole }))}>
          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
        </SelectField>

        <SelectField label="Assigned Building" id="userBuilding" value={draft.buildingId} onChange={(value) => setDraft((current) => ({ ...current, buildingId: value }))}>
          <option value="">No building assigned</option>
          {buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
        </SelectField>

        <Button fullWidth type="submit" disabled={saving}>{saving ? "Creating..." : "Create User"}</Button>
      </form>

      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="text-lg font-semibold">Users</h2>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {success && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}

        {loading ? <p className="mt-4 text-sm text-slate-500">Loading users...</p> : (
          <ul className="mt-4 space-y-3">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-800">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-slate-500">{user.email} · {user.role}</p>
                </div>
                <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setEditingUser({ ...user })}>Edit</Button><Button variant="secondary" onClick={() => void resetPassword(user.email)}>Reset Password</Button><Button variant={user.active ? "danger" : "secondary"} onClick={() => void toggleUser(user)}>{user.active ? "Deactivate" : "Activate"}</Button></div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {editingUser && <form className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-5 lg:col-span-2" onSubmit={saveUserEdit}><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Edit {editingUser.email}</h2><Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button></div><div className="grid gap-3 sm:grid-cols-2"><Input id="editEmployeeId" label="Employee ID" value={editingUser.employeeId} onChange={(event) => setEditingUser((current) => current && ({ ...current, employeeId: event.target.value }))} /><Input id="editFirstName" label="First Name" value={editingUser.firstName} onChange={(event) => setEditingUser((current) => current && ({ ...current, firstName: event.target.value }))} /><Input id="editLastName" label="Last Name" value={editingUser.lastName} onChange={(event) => setEditingUser((current) => current && ({ ...current, lastName: event.target.value }))} /></div><SelectField label="Role" id="editRole" value={editingUser.role} onChange={(value) => setEditingUser((current) => current && ({ ...current, role: value as UserRole }))}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</SelectField><SelectField label="Assigned Building" id="editBuilding" value={editingUser.buildingId} onChange={(value) => setEditingUser((current) => current && ({ ...current, buildingId: value }))}><option value="">No building assigned</option>{buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</SelectField><Button type="submit">Save User</Button></form>}
    </section>
  );
}

function SelectField({
  label,
  id,
  value,
  onChange,
  children,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200">
        {children}
      </select>
    </div>
  );
}
