import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Input from "../../../shared/components/Input";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import { createManagedUser, type NewManagedUser } from "../../../services/userService";
import { getManagedBuildings, type BuildingOption } from "../../../services/buildingService";
import { ROUTES } from "../../../app/routes";

const roles = ["EMPLOYEE", "SECURITY", "ADMIN", "DEVELOPER"] as const;

const emptyUser: NewManagedUser = {
  email: "",
  password: "",
  employeeId: "",
  firstName: "",
  lastName: "",
  role: "EMPLOYEE",
  buildingId: "",
};

export default function CreateUserPage() {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [draft, setDraft] = useState<NewManagedUser>(emptyUser);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadBuildings() {
      try {
        setBuildings(await getManagedBuildings());
      } catch {
        setError("Unable to load buildings.");
      } finally {
        setLoading(false);
      }
    }

    void loadBuildings();
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
      setSuccess("User account created successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create a new user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-8 py-8">
        <PageHeader
          title="Create User"
          subtitle="Add a new company user and assign their role, office, and access level."
          actions={
            <Button variant="secondary" onClick={() => navigate(ROUTES.USERS)}>
              View users
            </Button>
          }
        />

        <Card>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="firstName"
                label="First Name"
                value={draft.firstName}
                onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))}
                required
              />
              <Input
                id="lastName"
                label="Last Name"
                value={draft.lastName}
                onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="email"
                type="email"
                label="Email"
                value={draft.email}
                onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                required
              />
              <Input
                id="password"
                type="password"
                label="Temporary password"
                value={draft.password}
                onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="employeeId"
                label="Employee ID"
                value={draft.employeeId}
                onChange={(event) => setDraft((current) => ({ ...current, employeeId: event.target.value }))}
              />
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-semibold text-slate-800">Role</label>
                <select
                  id="role"
                  value={draft.role}
                  onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as NewManagedUser["role"] }))}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="building" className="text-sm font-semibold text-slate-800">Assigned building</label>
              <select
                id="building"
                value={draft.buildingId}
                onChange={(event) => setDraft((current) => ({ ...current, buildingId: event.target.value }))}
                disabled={loading}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">No building assigned</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
              {loading ? <p className="mt-2 text-xs text-slate-500">Loading building options...</p> : null}
            </div>

            {error && <p className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error}</p>}
            {success && <p className="rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</p>}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Creating user…" : "Create user"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate(ROUTES.USERS)} className="w-full sm:w-auto">
                View users
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
