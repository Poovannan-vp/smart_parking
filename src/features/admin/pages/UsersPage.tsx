import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import EmptyState from "../../../shared/components/EmptyState";
import Input from "../../../shared/components/Input";
import Select from "../../../shared/components/Select";
import Modal from "../../../shared/components/Modal";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import StatusBadge from "../../../shared/components/StatusBadge";
import Alert from "../../../shared/components/Alert";
import LoadingState from "../../../shared/components/LoadingState";
import {
  deleteManagedUser,
  getManagedUsers,
  sendManagedUserPasswordReset,
  setManagedUserActive,
  setManagedUserPassword,
  updateManagedUser,
  type ManagedUser,
} from "../../../services/userService";
import { getBuildings, type BuildingOption } from "../../../services/buildingService";
import LoadMoreButton from "../../../components/LoadMoreButton";
import { ROUTES } from "../../../app/routes";
import type { UserRole } from "../../../types/common";

const EDITABLE_ROLES: UserRole[] = ["EMPLOYEE", "SECURITY", "ADMIN", "DEVELOPER"];

const ROLE_FILTERS = ["ALL", "EMPLOYEE", "SECURITY", "ADMIN", "DEVELOPER"] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number];

const ROLE_LABELS: Record<RoleFilter, string> = {
  ALL: "All roles",
  EMPLOYEE: "Employee",
  SECURITY: "Security",
  ADMIN: "Admin",
  DEVELOPER: "Developer",
};

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [displayedCount, setDisplayedCount] = useState<number>(4);

  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editDraft, setEditDraft] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    role: "EMPLOYEE" as UserRole,
    buildingId: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);

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
    void getBuildings().then(setBuildings).catch(() => setBuildings([]));
  }, []);

  function beginEdit(user: ManagedUser) {
    setEditingUser(user);
    setEditDraft({
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      role: user.role,
      buildingId: user.buildingId,
    });
    setEditError(null);
    setEditSuccess(null);
    setNewPassword("");
    setPasswordError(null);
    setPasswordSuccess(null);
  }

  function closeEdit() {
    setEditingUser(null);
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;

    if (!editDraft.firstName.trim() || !editDraft.lastName.trim()) {
      setEditError("First and last name are required.");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      await updateManagedUser(editingUser.id, {
        firstName: editDraft.firstName.trim(),
        lastName: editDraft.lastName.trim(),
        employeeId: editDraft.employeeId.trim(),
        role: editDraft.role,
        buildingId: editDraft.buildingId,
      });
      setEditSuccess("Profile updated.");
      await loadUsers();
    } catch {
      setEditError("Unable to save changes.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleSetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      await setManagedUserPassword(editingUser.id, newPassword);
      setPasswordSuccess("Password updated.");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Unable to set the new password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  // Text search narrows first; the role filter then narrows further. Chip
  // counts are computed from this so they reflect live search matches per
  // role, not the unfiltered total.
  const searchedUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return users;

    return users.filter((user) =>
      [user.firstName, user.lastName, user.email, user.employeeId, user.role]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [search, users]);

  const roleCounts = useMemo(() => {
    const counts = { ALL: searchedUsers.length } as Record<RoleFilter, number>;
    for (const role of ROLE_FILTERS) {
      if (role === "ALL") continue;
      counts[role] = searchedUsers.filter((user) => user.role === role).length;
    }
    return counts;
  }, [searchedUsers]);

  const filteredUsers = useMemo(() => {
    if (roleFilter === "ALL") return searchedUsers;
    return searchedUsers.filter((user) => user.role === (roleFilter as UserRole));
  }, [searchedUsers, roleFilter]);

  // Start pagination fresh whenever the visible set changes shape.
  useEffect(() => {
    setDisplayedCount(4);
  }, [search, roleFilter]);

  const displayedUsers = filteredUsers.slice(0, displayedCount);

  async function handleToggleActive(user: ManagedUser) {
    setError(null);
    setSuccess(null);

    try {
      await setManagedUserActive(user.id, !user.active);
      await loadUsers();
      setSuccess(`User ${user.active ? "deactivated" : "activated"} successfully.`);
    } catch {
      setError("Unable to update user status.");
    }
  }

  async function handleResetPassword(email: string) {
    setError(null);
    setSuccess(null);

    try {
      await sendManagedUserPasswordReset(email);
      setSuccess(`Password reset email sent to ${email}.`);
    } catch {
      setError("Unable to send password reset email.");
    }
  }

  async function handleDelete(userId: string) {
    if (!window.confirm("Delete this user permanently?")) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await deleteManagedUser(userId);
      await loadUsers();
      setSuccess("User deleted successfully.");
    } catch {
      setError("Unable to delete user.");
    }
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-7xl space-y-8 py-8">
        <PageHeader
          title="User Management"
          subtitle="View account status, reset access, and manage user activity from a single place."
          actions={
            <>
              <Button variant="secondary" onClick={() => navigate(ROUTES.ADMIN)}>
                Back to Admin
              </Button>
              <Button variant="secondary" onClick={() => navigate(ROUTES.CREATE_USER)}>
                Create User
              </Button>
            </>
          }
        />

        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_260px]">
            <Card className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Search</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">Find users quickly</p>
                </div>
                <div className="w-full sm:w-72">
                  <Input
                    id="userSearch"
                    label="Search users"
                    placeholder="Search by name, email, ID or role"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {ROLE_FILTERS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    aria-pressed={roleFilter === role}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                      roleFilter === role
                        ? "border-temenos-navy bg-temenos-navy text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {ROLE_LABELS[role]}
                    <span className={roleFilter === role ? "opacity-80" : "text-slate-400"}>{roleCounts[role]}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Total accounts</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{users.length}</p>
              <p className="mt-2 text-sm text-slate-500">{filteredUsers.length} result{filteredUsers.length === 1 ? "" : "s"} shown</p>
            </Card>
          </div>

          <Card>
            {error && <Alert variant="error" className="mb-4">{error}</Alert>}
            {success && <Alert variant="success" className="mb-4">{success}</Alert>}

            {loading ? (
              <LoadingState message="Loading users…" inline />
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                title={users.length === 0 ? "No users found" : "No matching users"}
                description={
                  users.length === 0
                    ? "There are no user accounts yet."
                    : "Try another search term or role filter to find users."
                }
                action={
                  <Button variant="secondary" onClick={() => navigate(ROUTES.CREATE_USER)}>
                    Create first user
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                  {displayedUsers.map((user) => (
                    <li key={user.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                          <p className="mt-1 text-sm text-slate-500">{user.email} · {user.employeeId || "No employee ID"}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge variant={user.active ? "success" : "danger"}>{user.active ? "Active" : "Inactive"}</StatusBadge>
                          <StatusBadge variant="info">{user.role}</StatusBadge>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                          <p className="font-semibold text-slate-900">Assigned building</p>
                          <p className="mt-2">{user.buildingId || "None"}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                          <p className="font-semibold text-slate-900">User role</p>
                          <p className="mt-2">{user.role}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => beginEdit(user)}>Edit</Button>
                          <Button variant="secondary" onClick={() => void handleResetPassword(user.email)}>Reset password</Button>
                          <Button variant={user.active ? "danger" : "secondary"} onClick={() => void handleToggleActive(user)}>
                            {user.active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button variant="danger" onClick={() => void handleDelete(user.id)}>Delete</Button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {displayedCount < filteredUsers.length && (
                    <LoadMoreButton onClick={() => setDisplayedCount(prev => prev + 4)} />
                  )}              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={Boolean(editingUser)} onClose={closeEdit} title={editingUser ? `Edit ${editingUser.firstName} ${editingUser.lastName}` : "Edit user"}>
        {editingUser ? (
          <div className="space-y-6">
            <form className="space-y-4" onSubmit={handleSaveEdit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="editFirstName"
                  label="First Name"
                  value={editDraft.firstName}
                  onChange={(event) => setEditDraft((current) => ({ ...current, firstName: event.target.value }))}
                  required
                />
                <Input
                  id="editLastName"
                  label="Last Name"
                  value={editDraft.lastName}
                  onChange={(event) => setEditDraft((current) => ({ ...current, lastName: event.target.value }))}
                  required
                />
              </div>

              <Input
                id="editEmployeeId"
                label="Employee ID"
                value={editDraft.employeeId}
                onChange={(event) => setEditDraft((current) => ({ ...current, employeeId: event.target.value }))}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  id="editRole"
                  label="Role"
                  value={editDraft.role}
                  onChange={(event) => setEditDraft((current) => ({ ...current, role: event.target.value as UserRole }))}
                >
                  {EDITABLE_ROLES.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </Select>

                <Select
                  id="editBuilding"
                  label="Assigned Building"
                  value={editDraft.buildingId}
                  onChange={(event) => setEditDraft((current) => ({ ...current, buildingId: event.target.value }))}
                >
                  <option value="">None</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </Select>
              </div>

              {editError ? <Alert variant="error">{editError}</Alert> : null}
              {editSuccess ? <Alert variant="success">{editSuccess}</Alert> : null}

              <Button type="submit" fullWidth disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>

            <form className="space-y-4 border-t border-slate-100 pt-6" onSubmit={handleSetPassword}>
              <div>
                <p className="text-sm font-bold text-temenos-navy">Set New Password</p>
                <p className="mt-1 text-xs text-slate-500">Sets the account's password directly - the user isn't notified. Use "Reset password" instead to email them a reset link.</p>
              </div>

              <Input
                id="newPassword"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
              />

              {passwordError ? <Alert variant="error">{passwordError}</Alert> : null}
              {passwordSuccess ? <Alert variant="success">{passwordSuccess}</Alert> : null}

              <Button type="submit" variant="secondary" fullWidth disabled={passwordSaving}>
                {passwordSaving ? "Saving..." : "Set Password"}
              </Button>
            </form>
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
