"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function DailyUpdatesStatus() {
  const [statuses, setStatuses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/daily-work-updates/today-status")
      .then((data) => setStatuses(data.statuses))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const submittedCount = statuses.filter((s) => s.submitted).length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">
            {submittedCount} / {statuses.length} submitted today
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-600">
                <tr>
                  <th className="py-2 pr-4 font-medium">Employee</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Current project</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((s) => (
                  <tr key={s.user.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">
                      {s.user.name} <span className="text-slate-400">({s.user.employeeId})</span>
                    </td>
                    <td className="py-2 pr-4">
                      {s.submitted ? (
                        <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                          Submitted
                        </span>
                      ) : (
                        <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                          Not yet
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{s.currentProject ?? "—"}</td>
                  </tr>
                ))}
                {statuses.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
