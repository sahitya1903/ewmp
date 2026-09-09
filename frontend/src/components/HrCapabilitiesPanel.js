"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useHrCapabilities } from "@/lib/useHrCapabilities";
import { HR_CAPABILITY_LABELS, HR_CAPABILITY_KEYS } from "@/lib/hrCapabilities";

// Admin-only: which console features the HR role gets. Unlike the module
// table above, this isn't per-role — HR is the only role with its own
// console beyond the plain-employee dashboard, so there's one fixed list.
export default function HrCapabilitiesPanel() {
  const { enabledCapabilities, loading, error: loadError, reload } = useHrCapabilities();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const current = draft ?? enabledCapabilities;
  const dirty = draft !== null;

  function toggle(key) {
    setDraft((prevDraft) => {
      const set = new Set(prevDraft ?? enabledCapabilities);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return [...set];
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await apiFetch("/hr-capabilities", { method: "PUT", body: JSON.stringify({ enabledCapabilities: current }) });
      setDraft(null);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">HR Console Access</h2>
      <p className="mb-4 text-sm text-slate-600">
        Choose which console features the HR role can use. Admin always has all of these.
      </p>

      {(loadError || error) && <p className="mb-3 text-sm text-red-600">{loadError || error}</p>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-4">
            {HR_CAPABILITY_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={current.includes(key)} onChange={() => toggle(key)} />
                {HR_CAPABILITY_LABELS[key]}
              </label>
            ))}
          </div>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      )}
    </div>
  );
}
