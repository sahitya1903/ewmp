"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

const BASE_TYPE_LABEL = { management: "Management", employee: "Employee" };

// Admin-facing: add or remove the categories a custom role can belong to.
// The two built-ins ("management" / "employee") can't be removed. A custom
// category picks a base type and then behaves exactly like it. Takes the
// shared useCategories() result from RoleManager so both stay in sync.
export default function CategoryManager({ categories, loading, error: loadError, reload }) {
  const [name, setName] = useState("");
  const [baseType, setBaseType] = useState("employee");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/categories", { method: "POST", body: JSON.stringify({ name, baseType }) });
      setName("");
      setBaseType("employee");
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(categoryName) {
    if (!window.confirm(`Delete the "${categoryName}" category?`)) return;
    setDeleting(categoryName);
    setError("");
    try {
      await apiFetch(`/categories/${encodeURIComponent(categoryName)}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Categories</h3>

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">New category name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Contractors"
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Base type</label>
          <select
            value={baseType}
            onChange={(e) => setBaseType(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="employee">Employee</option>
            <option value="management">Management</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add category"}
        </button>
      </form>
      <p className="mb-4 text-xs text-slate-500">
        A custom category behaves like its base type: <strong>Employee</strong> roles land on the dashboard and
        are gated by the Employee Role Permissions table; <strong>Management</strong> roles get their own console
        and are gated by the Management Role Capabilities table. The built-in <code>management</code> and{" "}
        <code>employee</code> categories can&apos;t be deleted.
      </p>

      {(loadError || error) && <p className="mb-3 text-sm text-red-600">{loadError || error}</p>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat.name}
              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
            >
              {cat.name}
              <span className="text-slate-400">({BASE_TYPE_LABEL[cat.baseType]})</span>
              {!cat.isBuiltIn && (
                <button
                  type="button"
                  onClick={() => handleDelete(cat.name)}
                  disabled={deleting === cat.name}
                  aria-label={`Delete ${cat.name}`}
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
  );
}
