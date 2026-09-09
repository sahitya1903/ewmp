"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import MonthCalendar, { toDateKey } from "@/components/MonthCalendar";
import NoticeBoard from "@/components/NoticeBoard";
import MyFollowUps from "@/components/MyFollowUps";
import StatTile from "@/components/StatTile";
import { apiFetch } from "@/lib/api";
import { currency, formatDateDMY, MONTH_NAMES } from "@/lib/format";
import { thisMonth, addMonths, today } from "@/lib/month";
import { useSalaries } from "@/lib/useSalaries";
import { MODULE_KEYS } from "@/lib/modules";

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-800 border-amber-300",
  Approved: "bg-emerald-50 text-emerald-800 border-emerald-300",
  Rejected: "bg-red-50 text-red-800 border-red-300",
};

const ATTENDANCE_TYPE = { Present: "present", Absent: "absent", Leave: "leave" };

const EMPTY_UPDATE_FORM = {
  currentProject: "",
  todaysProgress: "",
  remainingWork: "",
  estimatedCompletion: "",
  additionalWork: "",
};

function EmployeeDashboard() {
  // Defaults to fully enabled so nothing flashes hidden while this loads;
  // corrected as soon as Admin's Access Control settings for this role come back.
  const [enabledModules, setEnabledModules] = useState(MODULE_KEYS);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const canUse = (moduleKey) => enabledModules.includes(moduleKey);

  const [cursor, setCursor] = useState(thisMonth());
  const [entriesByDate, setEntriesByDate] = useState({});
  const [calendarLoading, setCalendarLoading] = useState(true);

  const lastMonth = addMonths(thisMonth(), -1);
  const { salaries: lastMonthSalaries } = useSalaries(lastMonth.month, lastMonth.year);
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

  const [todayUpdate, setTodayUpdate] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [updateFormOpen, setUpdateFormOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState(EMPTY_UPDATE_FORM);
  const [updateError, setUpdateError] = useState("");
  const [updateSaving, setUpdateSaving] = useState(false);

  function loadCalendar() {
    return Promise.resolve()
      .then(() => setCalendarLoading(true))
      .then(() =>
        Promise.all([
          apiFetch(`/holidays?year=${cursor.year}`),
          canUse("attendance") ? apiFetch(`/attendance?month=${cursor.month}&year=${cursor.year}`) : { attendance: [] },
          canUse("notices") ? apiFetch(`/notices?year=${cursor.year}`) : { notices: [] },
        ])
      )
      .then(([holidaysRes, attendanceRes, noticesRes]) => {
        const map = {};
        for (const h of holidaysRes.holidays) {
          const key = toDateKey(h.date);
          if (new Date(h.date).getUTCMonth() + 1 === cursor.month) {
            map[key] = { type: "holiday", label: h.name };
          }
        }
        for (const n of noticesRes.notices) {
          const key = toDateKey(n.date);
          if (new Date(n.date).getUTCMonth() + 1 === cursor.month && !map[key]) {
            map[key] = { type: "notice", label: n.title };
          }
        }
        for (const a of attendanceRes.attendance) {
          map[toDateKey(a.date)] = { type: ATTENDANCE_TYPE[a.status] ?? "present", label: a.status };
        }
        setEntriesByDate(map);
      })
      .catch(() => setEntriesByDate({}))
      .finally(() => setCalendarLoading(false));
  }

  function loadTodayUpdate() {
    return apiFetch("/daily-work-updates/today")
      .then((data) => setTodayUpdate(data.update))
      .catch(() => setTodayUpdate(null));
  }

  // If an admin has already marked today's attendance directly, the employee
  // doesn't need to be nagged for a work update — Absent/Leave can't take one
  // anyway (the API rejects it), and an admin-marked Present already accounts
  // for the day.
  function loadTodayAttendance() {
    if (!canUse("attendance")) {
      return Promise.resolve().then(() => setTodayAttendance(null));
    }
    const { year, month } = thisMonth();
    return apiFetch(`/attendance?month=${month}&year=${year}`)
      .then((data) => {
        const todayKey = toDateKey(today());
        const record = data.attendance.find((a) => toDateKey(a.date) === todayKey);
        setTodayAttendance(record?.status ?? null);
      })
      .catch(() => setTodayAttendance(null));
  }

  function loadLeaveRequests() {
    return Promise.resolve()
      .then(() => {
        setLeaveLoading(true);
        setListError("");
      })
      .then(() => apiFetch("/leave-requests"))
      .then((data) => setLeaveRequests(data.leaveRequests))
      .catch((err) => setListError(err.message))
      .finally(() => setLeaveLoading(false));
  }

  useEffect(() => {
    apiFetch("/role-permissions/mine")
      .then((data) => setEnabledModules(data.enabledModules))
      .catch(() => setEnabledModules(MODULE_KEYS))
      .finally(() => setPermissionsLoaded(true));
  }, []);

  useEffect(() => {
    if (!permissionsLoaded) return;
    loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, permissionsLoaded]);

  useEffect(() => {
    if (!permissionsLoaded) return;
    if (canUse("leave")) {
      loadLeaveRequests();
      apiFetch("/leave-requests/balance")
        .then(setLeaveBalance)
        .catch(() => setLeaveBalance(null));
    } else {
      Promise.resolve().then(() => setLeaveLoading(false));
    }
    if (canUse("dailyWorkUpdate")) {
      loadTodayUpdate();
    }
    loadTodayAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsLoaded]);

  function openUpdateForm() {
    setUpdateForm(
      todayUpdate
        ? {
            currentProject: todayUpdate.currentProject,
            todaysProgress: todayUpdate.todaysProgress,
            remainingWork: todayUpdate.remainingWork,
            estimatedCompletion: todayUpdate.estimatedCompletion ? todayUpdate.estimatedCompletion.slice(0, 10) : "",
            additionalWork: todayUpdate.additionalWork ?? "",
          }
        : EMPTY_UPDATE_FORM
    );
    setUpdateError("");
    setUpdateFormOpen(true);
  }

  async function handleUpdateSubmit(e) {
    e.preventDefault();
    setUpdateSaving(true);
    setUpdateError("");
    try {
      await apiFetch("/daily-work-updates", {
        method: "POST",
        body: JSON.stringify(updateForm),
      });
      setUpdateFormOpen(false);
      await loadTodayUpdate();
      await loadTodayAttendance();
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setUpdateSaving(false);
    }
  }

  function prevMonth() {
    setCursor((c) => addMonths(c, -1));
  }
  function nextMonth() {
    setCursor((c) => addMonths(c, 1));
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
      <main className="min-h-screen bg-slate-50 px-3 py-6 sm:px-6">
        <div className="w-full">
          <h1 className="text-xl font-semibold text-slate-900">Employee Dashboard</h1>
          <p className="mt-1 mb-6 text-sm text-slate-600">
            Your daily work update, leave, company notices, and the attendance/holiday calendar.
            Notifications appear in the bell at the top right.
          </p>

          {canUse("dailyWorkUpdate") && (
            <>
              <div className="mb-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Today&apos;s Work Update</h2>
                  {todayUpdate ? (
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-medium text-emerald-700">Submitted</span> — {todayUpdate.currentProject}
                    </p>
                  ) : todayAttendance === "Absent" ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Marked <span className="font-medium text-red-700">Absent</span> today by Admin — no work update needed.
                    </p>
                  ) : todayAttendance === "Leave" ? (
                    <p className="mt-1 text-sm text-slate-600">You&apos;re on approved leave today — no work update needed.</p>
                  ) : todayAttendance === "Present" ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Marked <span className="font-medium text-emerald-700">Present</span> today by Admin — a work update is optional.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-700">Not submitted yet today.</p>
                  )}
                </div>
                {todayAttendance !== "Absent" && todayAttendance !== "Leave" && (
                  <button
                    onClick={openUpdateForm}
                    className="self-start rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white sm:self-auto"
                  >
                    {todayUpdate ? "Edit update" : "Submit update"}
                  </button>
                )}
              </div>

              <MyFollowUps />
            </>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              {(canUse("leave") || canUse("salary")) && (
                <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,240px))] gap-4">
                  {canUse("leave") && leaveBalance && (
                    <StatTile
                      label="Paid leaves remaining"
                      value={`${leaveBalance.remaining}`}
                      sub={`${leaveBalance.accrued} accrued of ${leaveBalance.quota}/year`}
                    />
                  )}
                  {canUse("salary") && mySalaryLastMonth && (
                    <StatTile
                      label="Last month's salary"
                      value={currency(mySalaryLastMonth.salaryPayable)}
                      sub={
                        mySalaryLastMonth.credited
                          ? `Credited ${formatDateDMY(mySalaryLastMonth.creditedDate)}`
                          : `${MONTH_NAMES[lastMonth.month - 1]} ${lastMonth.year} — not yet credited`
                      }
                    />
                  )}
                </div>
              )}

              {canUse("leave") && (
                <>
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
                              <td className="px-3 py-2">{formatDateDMY(lr.fromDate)}</td>
                              <td className="px-3 py-2">{formatDateDMY(lr.toDate)}</td>
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
                </>
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
                  ...(canUse("notices") ? [{ type: "notice", label: "Notice / Meeting" }] : []),
                  ...(canUse("attendance")
                    ? [
                        { type: "present", label: "Present" },
                        { type: "absent", label: "Absent" },
                        { type: "leave", label: "Leave" },
                      ]
                    : []),
                ]}
              />
            </div>
          </div>

          {canUse("notices") && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Notices &amp; Meetings</h2>
              <NoticeBoard />
            </div>
          )}
        </div>

        {formOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
            <form
              onSubmit={handleSubmit}
              className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Apply for leave</h2>

              <label className="mb-1 block text-xs font-medium text-slate-700">From</label>
              <input
                type="date"
                required
                min={toDateKey(today())}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />

              <label className="mb-1 block text-xs font-medium text-slate-700">To</label>
              <input
                type="date"
                required
                min={fromDate || toDateKey(today())}
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

        {updateFormOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
            <form
              onSubmit={handleUpdateSubmit}
              className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Today&apos;s work update</h2>

              <label className="mb-1 block text-xs font-medium text-slate-700">Current project</label>
              <input
                required
                value={updateForm.currentProject}
                onChange={(e) => setUpdateForm({ ...updateForm, currentProject: e.target.value })}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />

              <label className="mb-1 block text-xs font-medium text-slate-700">Today&apos;s progress</label>
              <textarea
                required
                value={updateForm.todaysProgress}
                onChange={(e) => setUpdateForm({ ...updateForm, todaysProgress: e.target.value })}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                rows={2}
              />

              <label className="mb-1 block text-xs font-medium text-slate-700">Remaining work</label>
              <textarea
                required
                value={updateForm.remainingWork}
                onChange={(e) => setUpdateForm({ ...updateForm, remainingWork: e.target.value })}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                rows={2}
              />

              <label className="mb-1 block text-xs font-medium text-slate-700">
                Estimated completion (optional)
              </label>
              <input
                type="date"
                value={updateForm.estimatedCompletion}
                onChange={(e) => setUpdateForm({ ...updateForm, estimatedCompletion: e.target.value })}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />

              <label className="mb-1 block text-xs font-medium text-slate-700">Additional work (optional)</label>
              <textarea
                value={updateForm.additionalWork}
                onChange={(e) => setUpdateForm({ ...updateForm, additionalWork: e.target.value })}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                rows={2}
              />

              {updateError && <p className="mb-3 text-sm text-red-600">{updateError}</p>}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUpdateFormOpen(false)}
                  className="rounded px-4 py-2 text-sm text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSaving}
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {updateSaving ? "Saving..." : "Save"}
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
    <RoleGuard deniedCategories={["management"]}>
      <EmployeeDashboard />
    </RoleGuard>
  );
}
