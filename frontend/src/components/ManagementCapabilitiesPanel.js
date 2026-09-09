"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useManagementCapabilities } from "@/lib/useManagementCapabilities";
import { ROLE_LABELS } from "@/lib/roles";
import { MANAGEMENT_CAPABILITY_LABELS, MANAGEMENT_CAPABILITY_KEYS } from "@/lib/managementCapabilities";

// Admin-only: which console features HR and Accounts get. They have similar
// permission shapes, so they're configured together in one table here.
// Admin itself always has full access and isn't listed.
export default function ManagementCapabilitiesPanel() {
  const { roleCapabilities, loading, error: loadError, reload } = useManagementCapabilities();
  const [drafts, setDrafts] = useState({});
  const [savingRole, setSavingRole] = useState(null);
  const [error, setError] = useState("");

  function toggle(role, current, key) {
    const set = new Set(current);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    setDrafts((d) => ({ ...d, [role]: [...set] }));
  }

  async function save(role, enabledCapabilities) {
    setSavingRole(role);
    setError("");
    try {
      await apiFetch(`/management-capabilities/${encodeURIComponent(role)}`, {
        method: "PUT",
        body: JSON.stringify({ enabledCapabilities }),
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
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Management Role Capabilities</h2>
      <p className="mb-4 text-sm text-slate-600">
        Choose which console features HR and Accounts can use. Admin always has all of these.
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
                {MANAGEMENT_CAPABILITY_KEYS.map((key) => (
                  <th key={key} className="px-3 py-2 font-medium">
                    {MANAGEMENT_CAPABILITY_LABELS[key]}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {roleCapabilities.map((row) => {
                const enabled = drafts[row.role] ?? row.enabledCapabilities;
                const dirty = drafts[row.role] !== undefined;
                return (
                  <tr key={row.role} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {ROLE_LABELS[row.role] ?? row.role}
                    </td>
                    {MANAGEMENT_CAPABILITY_KEYS.map((key) => (
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
