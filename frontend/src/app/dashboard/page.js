"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import MonthCalendar, { toDateKey } from "@/components/MonthCalendar";
import StatTile from "@/components/StatTile";
import { apiFetch } from "@/lib/api";
import { currency, MONTH_NAMES } from "@/lib/format";
import { useSalaries } from "@/lib/useSalaries";

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-800 border-amber-300",
  Approved: "bg-emerald-50 text-emerald-800 border-emerald-300",
  Rejected: "bg-red-50 text-red-800 border-red-300",
};

const ATTENDANCE_TYPE = { Present: "present", Absent: "absent", Leave: "leave" };

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

function today() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function previousMonth({ month, year }) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
}

function isWeekend(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function EmployeeDashboard() {
  const [cursor, setCursor] = useState(today());
  const [entriesByDate, setEntriesByDate] = useState({});
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [joiningDateKey, setJoiningDateKey] = useState(null);

  const thisMonth = today();
  const lastMonth = previousMonth(thisMonth);
  const { salaries: currentMonthSalaries } = useSalaries(thisMonth.month, thisMonth.year);
  const { salaries: lastMonthSalaries } = useSalaries(lastMonth.month, lastMonth.year);
  const mySalaryThisMonth = currentMonthSalaries[0];
  const mySalaryLastMonth = lastMonthSalaries[0];

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [leaveBalance, setLeaveBalance] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadCalendar() {
    setCalendarLoading(true);
    try {
      const [holidaysRes, attendanceRes] = await Promise.all([
        apiFetch(`/holidays?year=${cursor.year}`),
        apiFetch(`/attendance?month=${cursor.month}&year=${cursor.year}`),
      ]);

      const map = {};
      for (const h of holidaysRes.holidays) {
        const key = toDateKey(h.date);
        if (new Date(h.date).getUTCMonth() + 1 === cursor.month) {
          map[key] = { type: "holiday", label: h.name };
        }
      }
      for (const a of attendanceRes.attendance) {
        map[toDateKey(a.date)] = { type: ATTENDANCE_TYPE[a.status] ?? "present", label: a.status };
      }

      // Default to Present for any past/current working day with no explicit
      // record — an employee is only Absent if an admin marks them so.
      const todayKey = toDateKey(new Date());
      const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(Date.UTC(cursor.year, cursor.month - 1, d));
        const key = toDateKey(date);
        if (map[key] || key > todayKey || isWeekend(date)) continue;
        if (joiningDateKey && key < joiningDateKey) continue;
        map[key] = { type: "present", label: "Present" };
      }

      setEntriesByDate(map);
    } catch {
      setEntriesByDate({});
    } finally {
      setCalendarLoading(false);
    }
  }

  async function loadLeaveRequests() {
    setLeaveLoading(true);
    setListError("");
    try {
      const data = await apiFetch("/leave-requests");
      setLeaveRequests(data.leaveRequests);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLeaveLoading(false);
    }
  }

  useEffect(() => {
    loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, joiningDateKey]);

  useEffect(() => {
    loadLeaveRequests();
    apiFetch("/leave-requests/balance")
      .then(setLeaveBalance)
      .catch(() => setLeaveBalance(null));
    apiFetch("/auth/me")
      .then((data) => {
        if (data.user.joiningDate) setJoiningDateKey(toDateKey(data.user.joiningDate));
      })
      .catch(() => {});
  }, []);

  function prevMonth() {
    setCursor((c) => (c.month === 1 ? { year: c.year - 1, month: 12 } : { year: c.year, month: c.month - 1 }));
  }
  function nextMonth() {
    setCursor((c) => (c.month === 12 ? { year: c.year + 1, month: 1 } : { year: c.year, month: c.month + 1 }));
  }

  function openForm() {
    setFromDate("");
    setToDate("");
    setReason("");
    setFormError("");
    setFormOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await apiFetch("/leave-requests", {
        method: "POST",
        body: JSON.stringify({ fromDate, toDate, reason }),
      });
      setFormOpen(false);
      await loadLeaveRequests();
      await loadCalendar();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AccountMenu />
      <main className="min-h-screen bg-slate-50 p-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-xl font-semibold text-slate-900">Employee Dashboard</h1>
          <p className="mt-1 mb-6 text-sm text-slate-600">
            Daily work updates and notifications are coming in a later phase — this page currently
            covers leave and the attendance/holiday calendar.
          </p>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {leaveBalance && (
              <StatTile
                label="Paid leaves remaining"
                value={`${leaveBalance.remaining} / ${leaveBalance.quota}`}
                sub="This month"
              />
            )}
            {mySalaryLastMonth && (
              <StatTile
                label="Last month's salary"
                value={currency(mySalaryLastMonth.salaryPayable)}
                sub={
                  mySalaryLastMonth.credited
                    ? `Credited ${new Date(mySalaryLastMonth.creditedDate).toLocaleDateString()}`
                    : `${MONTH_NAMES[lastMonth.month - 1]} ${lastMonth.year} — not yet credited`
                }
              />
            )}
            {mySalaryThisMonth && (
              <StatTile
                label="This month's salary due"
                value={currency(mySalaryThisMonth.salaryPayable)}
                sub={
                  mySalaryThisMonth.deduction > 0
                    ? `${currency(mySalaryThisMonth.deduction)} deducted so far`
                    : `${MONTH_NAMES[thisMonth.month - 1]} ${thisMonth.year}`
                }
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">My Leave Requests</h2>
                <button
                  onClick={openForm}
                  className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Apply for leave
                </button>
              </div>

              {listError && <p className="mb-3 text-sm text-red-600">{listError}</p>}

              {leaveLoading ? (
                <p className="text-sm text-slate-600">Loading...</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">From</th>
                        <th className="px-3 py-2 font-medium">To</th>
                        <th className="px-3 py-2 font-medium">Reason</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map((lr) => (
                        <tr key={lr._id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{formatDate(lr.fromDate)}</td>
                          <td className="px-3 py-2">{formatDate(lr.toDate)}</td>
                          <td className="px-3 py-2">{lr.reason}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLES[lr.status]}`}>
                              {lr.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {leaveRequests.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                            No leave requests yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Calendar</h2>
              {calendarLoading && <p className="mb-2 text-xs text-slate-500">Refreshing…</p>}
              <MonthCalendar
                year={cursor.year}
                month={cursor.month}
                onPrev={prevMonth}
                onNext={nextMonth}
                entriesByDate={entriesByDate}
                legend={[
                  { type: "holiday", label: "Holiday" },
                  { type: "present", label: "Present" },
                  { type: "absent", label: "Absent" },
                  { type: "leave", label: "Leave" },
                ]}
              />
            </div>
          </div>
        </div>

        {formOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Apply for leave</h2>

              <label className="mb-1 block text-xs font-medium text-slate-700">From</label>
              <input
                type="date"
                required
                min={toDateKey(new Date())}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />

              <label className="mb-1 block text-xs font-medium text-slate-700">To</label>
              <input
                type="date"
                required
                min={fromDate || toDateKey(new Date())}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />

              <label className="mb-1 block text-xs font-medium text-slate-700">Reason</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                rows={3}
              />

              {formError && <p className="mb-3 text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded px-4 py-2 text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </>
  );
}

export default function DashboardPage() {
  return (
    <RoleGuard
      allowedRoles={["Developer_E", "Cyber Security_E", "Social Media & Performance Marketing_E", "Intern"]}
    >
      <EmployeeDashboard />
    </RoleGuard>
  );
}
