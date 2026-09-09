"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRolePermissions } from "@/lib/useRolePermissions";
import { ROLE_LABELS } from "@/lib/roles";
import { MODULE_LABELS, MODULE_KEYS } from "@/lib/modules";

export default function AccessControlPanel() {
  const { permissions, loading, error: loadError, reload } = useRolePermissions();
  const [drafts, setDrafts] = useState({});
  const [savingRole, setSavingRole] = useState(null);
  const [error, setError] = useState("");

  function toggle(role, current, moduleKey) {
    const set = new Set(current);
    if (set.has(moduleKey)) set.delete(moduleKey);
    else set.add(moduleKey);
    setDrafts((d) => ({ ...d, [role]: [...set] }));
  }

  async function save(role, enabledModules) {
    setSavingRole(role);
    setError("");
    try {
      await apiFetch(`/role-permissions/${encodeURIComponent(role)}`, {
        method: "PUT",
        body: JSON.stringify({ enabledModules }),
      });
      setDrafts((d) => {
        const next = { ...d };
        delete next[role];
        return next;
      });
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingRole(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Employee Role Permissions</h2>
      <p className="mb-4 text-sm text-slate-600">
        Choose which features each employee role can access. Admin and HR always have full access here.
      </p>

      {(loadError || error) && <p className="mb-3 text-sm text-red-600">{loadError || error}</p>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Role</th>
                {MODULE_KEYS.map((key) => (
                  <th key={key} className="px-3 py-2 font-medium">
                    {MODULE_LABELS[key]}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {permissions.map((row) => {
                const enabled = drafts[row.role] ?? row.enabledModules;
                const dirty = drafts[row.role] !== undefined;
                return (
                  <tr key={row.role} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {ROLE_LABELS[row.role] ?? row.role}
                    </td>
                    {MODULE_KEYS.map((key) => (
                      <td key={key} className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={enabled.includes(key)}
                          onChange={() => toggle(row.role, enabled, key)}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => save(row.role, enabled)}
                        disabled={!dirty || savingRole === row.role}
                        className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {savingRole === row.role ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {permissions.length === 0 && (
                <tr>
                  <td colSpan={MODULE_KEYS.length + 2} className="px-3 py-6 text-center text-slate-500">
                    No configurable roles yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
