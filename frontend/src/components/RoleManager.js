"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRoles } from "@/lib/useRoles";
import { ROLE_LABELS } from "@/lib/roles";

export default function RoleManager() {
  const { roles, loading, error: loadError, reload } = useRoles();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/roles", { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">New role name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. QA Engineer"
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add role"}
        </button>
      </form>

      {(loadError || error) && <p className="mb-3 text-sm text-red-600">{loadError || error}</p>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <span
              key={role}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
            >
              {ROLE_LABELS[role] ?? role}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
