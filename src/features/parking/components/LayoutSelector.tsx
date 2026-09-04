/**
 * Generic layout picker. Every location uses this same selection
 * mechanism - it never treats any layout name as a special category.
 * When `onCreate` is provided (Admin), it also offers adding a new,
 * admin-named layout.
 */

import { useState, type FormEvent } from "react";
import type { Layout } from "../../../types/parkingLayout";

interface LayoutSelectorProps {
  layouts: Layout[];
  selectedLayoutId: string;
  onChange: (layoutId: string) => void;
  onCreate?: (name: string) => Promise<void> | void;
}

export function LayoutSelector({ layouts, selectedLayoutId, onChange, onCreate }: LayoutSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onCreate || !newName.trim()) return;

    setCreating(true);
    try {
      await onCreate(newName.trim());
      setNewName("");
      setIsAdding(false);
    } finally {
      setCreating(false);
    }
  }

  // A single layout doesn't need a picker - show its name as plain text so
  // the Admin isn't asked to manage "multiple layouts" that don't exist yet.
  const singleLayout = layouts.length === 1 ? layouts[0] : null;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {layouts.length > 1 ? (
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Layout</label>
          <select
            value={selectedLayoutId}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 min-w-[220px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-temenos-teal focus:ring-2 focus:ring-temenos-teal/20"
          >
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
                {layout.isDefault ? " (Default)" : ""}
              </option>
            ))}
          </select>
        </div>
      ) : singleLayout ? (
        <p className="text-sm text-slate-700">
          Layout: <span className="font-semibold">{singleLayout.name}</span>
        </p>
      ) : null}

      {onCreate ? (
        isAdding ? (
          <form className="flex items-end gap-2" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">New layout name</label>
              <input
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Extension Floor 2"
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-temenos-teal focus:ring-2 focus:ring-temenos-teal/20"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="h-10 rounded-xl bg-temenos-teal px-4 text-sm font-semibold text-white transition hover:bg-temenos-teal-dark disabled:opacity-50"
            >
              {creating ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewName("");
              }}
              className="h-10 rounded-xl bg-slate-100 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="h-10 rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            + Add Layout
          </button>
        )
      ) : null}
    </div>
  );
}
