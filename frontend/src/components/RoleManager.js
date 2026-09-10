"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRoles } from "@/lib/useRoles";
import { useCategories } from "@/lib/useCategories";
import { ROLE_LABELS } from "@/lib/roles";
import CategoryManager from "@/components/CategoryManager";

export default function RoleManager() {
  const { roles, loading, error: loadError, reload } = useRoles();
  const categoriesState = useCategories();
  const { categories, loading: categoriesLoading } = categoriesState;
  const [name, setName] = useState("");
  // Left empty until the user picks one; `category` (below) falls back to the
  // first employee-base category, and self-corrects if the pick is deleted —
  // no effect needed.
  const [categoryChoice, setCategoryChoice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const category = categories.some((c) => c.name === categoryChoice)
    ? categoryChoice
    : (categories.find((c) => c.baseType === "employee") ?? categories[0])?.name ?? "";

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/roles", { method: "POST", body: JSON.stringify({ name, category }) });
      setName("");
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(roleName) {
    if (!window.confirm(`Delete the "${ROLE_LABELS[roleName] ?? roleName}" role?`)) return;
    setDeleting(roleName);
    setError("");
    try {
      await apiFetch(`/roles/${encodeURIComponent(roleName)}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <CategoryManager {...categoriesState} />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Roles</h3>

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
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategoryChoice(e.target.value)}
              disabled={categoriesLoading}
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.baseType === "management" ? "Management" : "Employee"})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving || !category}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add role"}
          </button>
        </form>
        <p className="mb-4 text-xs text-slate-500">
          A role&apos;s category decides how it behaves — see the base-type note above. A management-base role gets
          its own console (an existing name keeps its usual page; a new one gets a console at a URL based on its
          name) and starts with no capabilities until Admin grants some on the Access Control tab. Deleting a
          role needs every employee moved off it first.
        </p>

        {(loadError || error) && <p className="mb-3 text-sm text-red-600">{loadError || error}</p>}

        {loading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <span
                key={role.name}
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                {ROLE_LABELS[role.name] ?? role.name}
                <span className="text-slate-400">({role.category})</span>
                {!role.isBuiltIn && (
                  <button
                    type="button"
                    onClick={() => handleDelete(role.name)}
                    disabled={deleting === role.name}
                    aria-label={`Delete ${role.name}`}
                    className="ml-0.5 text-slate-400 hover:text-red-600 disabled:opacity-50"
                  >
                    &times;
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
