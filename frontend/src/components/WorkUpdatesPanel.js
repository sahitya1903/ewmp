"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { thisMonth, today } from "@/lib/month";
import { formatDateDMY } from "@/lib/format";
import MonthYearPicker from "@/components/MonthYearPicker";
import FollowUpThread from "@/components/FollowUpThread";
import { toDateKey } from "@/components/MonthCalendar";

function when(value) {
  const time = new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${formatDateDMY(value)}, ${time}`;
}

// HR/Admin view of employee daily work updates: today's submission roster plus
// the full content of every update in a chosen month, filterable by employee.
export default function WorkUpdatesPanel() {
  const [cursor, setCursor] = useState(thisMonth());
  const [employees, setEmployees] = useState([]);
  const [userId, setUserId] = useState("");
  // Narrows the fetched month down to one day; defaults to today. It's a
  // client-side filter over the already-fetched month, not a separate query.
  const [dateFilter, setDateFilter] = useState(() => toDateKey(today()));
  const [updates, setUpdates] = useState([]);
  const [todayStatuses, setTodayStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [followUpFor, setFollowUpFor] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const now = thisMonth();
  const isCurrentMonth = cursor.year === now.year && cursor.month === now.month;

  function load() {
    return Promise.resolve()
      .then(() => {
        setLoading(true);
        setError("");
      })
      .then(() => {
        const q = new URLSearchParams({ month: String(cursor.month), year: String(cursor.year) });
        if (userId) q.set("userId", userId);
        return Promise.all([
          apiFetch(`/daily-work-updates?${q.toString()}`),
          isCurrentMonth ? apiFetch("/daily-work-updates/today-status") : Promise.resolve({ statuses: [] }),
        ]);
      })
      .then(([updatesRes, statusRes]) => {
        setUpdates(updatesRes.updates);
        setTodayStatuses(statusRes.statuses);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    apiFetch("/employees")
      .then((d) => setEmployees(d.employees))
      .catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, userId]);

  // Picking a day jumps the month/year picker to match it, so the fetched
  // month always covers the chosen date.
  function handleDateFilterChange(value) {
    setDateFilter(value);
    if (value) {
      const [year, month] = value.split("-").map(Number);
      setCursor({ year, month });
    }
  }

  // Changing the month/year explicitly means "browse the whole month" —
  // drop any day filter so it doesn't hide everything outside itself.
  function handleMonthChange(month) {
    setCursor((c) => ({ ...c, month }));
    setDateFilter("");
  }
  function handleYearChange(year) {
    setCursor((c) => ({ ...c, year }));
    setDateFilter("");
  }

  async function sendFollowUp(id) {
    setSending(true);
    setError("");
    try {
      await apiFetch(`/daily-work-updates/${id}/follow-up`, {
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

  async function closeFollowUp(id) {
    setError("");
    try {
      await apiFetch(`/daily-work-updates/${id}/follow-up-close`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const notSubmittedToday = todayStatuses.filter((s) => !s.submitted);
  const visibleUpdates = dateFilter ? updates.filter((u) => toDateKey(u.date) === dateFilter) : updates;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          >
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeId})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            max={toDateKey(today())}
            onChange={(e) => handleDateFilterChange(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter("")}
              className="text-xs text-slate-500 underline hover:text-slate-700"
            >
              Clear date
            </button>
          )}
        </div>
        <MonthYearPicker
          month={cursor.month}
          year={cursor.year}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
        />
      </div>

      {isCurrentMonth && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <span className="font-medium text-slate-900">
            Today: {todayStatuses.length - notSubmittedToday.length} / {todayStatuses.length} submitted
          </span>
          {notSubmittedToday.length > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Not yet: {notSubmittedToday.map((s) => s.user.name).join(", ")}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : visibleUpdates.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          {dateFilter ? `No work updates for ${formatDateDMY(dateFilter)}.` : "No work updates for this month."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleUpdates.map((u) => (
            <li
              key={u.id}
              className={`rounded-lg border bg-white p-4 ${
                u.awaitingResponse
                  ? "border-amber-300 ring-1 ring-amber-200"
                  : u.followUps.length > 0 && !u.followUpClosed
                    ? "border-emerald-200"
                    : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {u.user ? `${u.user.name} (${u.user.employeeId})` : "—"}
                  <span className="ml-2 font-normal text-slate-500">{formatDateDMY(u.date)}</span>
                  {u.awaitingResponse && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      Follow-up pending
                    </span>
                  )}
                  {u.followUpClosed && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      Follow-up closed
                    </span>
                  )}
                </h3>
                <span className="text-xs text-slate-400">
                  submitted {when(u.submittedAt)}
                  {u.editedAt ? ` · edited ${when(u.editedAt)}` : ""}
                </span>
              </div>

              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[9rem_1fr]">
                <dt className="text-slate-500">Project</dt>
                <dd className="text-slate-800">{u.currentProject}</dd>
                <dt className="text-slate-500">Today&apos;s progress</dt>
                <dd className="whitespace-pre-line text-slate-800">{u.todaysProgress}</dd>
                <dt className="text-slate-500">Remaining work</dt>
                <dd className="whitespace-pre-line text-slate-800">{u.remainingWork || "—"}</dd>
                <dt className="text-slate-500">Est. completion</dt>
                <dd className="text-slate-800">{u.estimatedCompletion ? formatDateDMY(u.estimatedCompletion) : "—"}</dd>
                {u.additionalWork && (
                  <>
                    <dt className="text-slate-500">Additional work</dt>
                    <dd className="whitespace-pre-line text-slate-800">{u.additionalWork}</dd>
                  </>
                )}
              </dl>

              <div className="mt-3 space-y-2 border-t border-slate-100 pt-2 text-xs">
                <FollowUpThread entries={u.followUps} />

                {followUpFor !== u.id && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setFollowUpFor(u.id);
                        setNote("");
                      }}
                      className="text-slate-600 underline"
                    >
                      {u.followUps.length === 0
                        ? "Request follow-up"
                        : u.followUpClosed
                          ? "Reopen with a new request"
                          : "Request another follow-up"}
                    </button>
                    {u.followUps.length > 0 && !u.followUpClosed && (
                      <button onClick={() => closeFollowUp(u.id)} className="text-slate-600 underline">
                        Close follow-up
                      </button>
                    )}
                  </div>
                )}

                {followUpFor === u.id && (
                  <div className="mt-2 flex flex-col gap-2">
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="What should they clarify or expand on?"
                      className="w-full max-w-md rounded border border-slate-300 px-2 py-1 text-xs text-slate-900"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => sendFollowUp(u.id)}
                        disabled={sending || !note.trim()}
                        className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {sending ? "Sending..." : "Send"}
                      </button>
                      <button onClick={() => setFollowUpFor(null)} className="px-2 py-1 text-xs text-slate-600">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
