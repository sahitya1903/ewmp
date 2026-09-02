"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function DailyUpdatesStatus() {
  const [statuses, setStatuses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [followUpFor, setFollowUpFor] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const data = await apiFetch("/daily-work-updates/today-status");
      setStatuses(data.statuses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openFollowUp(updateId) {
    setFollowUpFor(updateId);
    setNote("");
    setError("");
  }

  async function sendFollowUp(updateId) {
    setSending(true);
    setError("");
    try {
      await apiFetch(`/daily-work-updates/${updateId}/follow-up`, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      setFollowUpFor(null);
      setNote("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

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
                  <th className="py-2 pr-4 font-medium">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((s) => (
                  <tr key={s.user.id} className="border-t border-slate-100 align-top">
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
                    <td className="py-2 pr-4">
                      {!s.submitted ? (
                        <span className="text-slate-300">—</span>
                      ) : followUpFor === s.updateId ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="What should they clarify or expand on?"
                            className="w-56 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendFollowUp(s.updateId)}
                              disabled={sending || !note.trim()}
                              className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                            >
                              {sending ? "Sending..." : "Send"}
                            </button>
                            <button
                              onClick={() => setFollowUpFor(null)}
                              className="px-2 py-1 text-xs text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : s.followUp ? (
                        <div className="text-xs text-slate-600">
                          <span className="text-amber-700">Requested</span>
                          {s.followUp.by ? ` by ${s.followUp.by}` : ""} — {s.followUp.note}
                          <button
                            onClick={() => openFollowUp(s.updateId)}
                            className="ml-2 text-slate-500 underline"
                          >
                            Again
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openFollowUp(s.updateId)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Request follow-up
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {statuses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
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
