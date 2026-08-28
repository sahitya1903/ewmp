"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import MonthCalendar, { toDateKey } from "@/components/MonthCalendar";
import LeaveRequestsPanel from "@/components/LeaveRequestsPanel";
import StatTile from "@/components/StatTile";
import DailyUpdatesStatus from "@/components/DailyUpdatesStatus";
import LeaveBalancesPanel from "@/components/LeaveBalancesPanel";
import EmployeesSection from "@/components/EmployeesSection";
import InternsSection from "@/components/InternsSection";
import { apiFetch } from "@/lib/api";

function today() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function Overview() {
  const [employeeCount, setEmployeeCount] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [noUpdateToday, setNoUpdateToday] = useState(0);
  const [leaveToday, setLeaveToday] = useState(0);
  const [absentToday, setAbsentToday] = useState(0);
  const [error, setError] = useState("");

  const [cursor, setCursor] = useState(today());
  const [entriesByDate, setEntriesByDate] = useState({});

  useEffect(() => {
    const { year, month } = today();
    const todayKey = toDateKey(new Date());

    Promise.all([apiFetch("/employees"), apiFetch(`/attendance?month=${month}&year=${year}`)])
      .then(([employeesData, attendanceData]) => {
        const total = employeesData.employees.length;
        const todaysRecords = attendanceData.attendance.filter((a) => toDateKey(a.date) === todayKey);
        const present = todaysRecords.filter((a) => a.status === "Present").length;
        const absent = todaysRecords.filter((a) => a.status === "Absent").length;
        const onLeave = todaysRecords.filter((a) => a.status === "Leave").length;

        setEmployeeCount(total);
        setPresentToday(present);
        setAbsentToday(absent);
        setLeaveToday(onLeave);
        // Present is only counted from an actual record — marked by an admin, or
        // created automatically when the employee submits today's work update.
        // Anyone with no record yet today falls in here, not silently into Present.
        setNoUpdateToday(Math.max(total - present - absent - onLeave, 0));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    apiFetch(`/holidays?year=${cursor.year}`)
      .then((data) => {
        const map = {};
        for (const h of data.holidays) {
          if (new Date(h.date).getUTCMonth() + 1 === cursor.month) {
            map[toDateKey(h.date)] = { type: "holiday", label: h.name };
          }
        }
        setEntriesByDate(map);
      })
      .catch(() => setEntriesByDate({}));
  }, [cursor]);

  function prevMonth() {
    setCursor((c) => (c.month === 1 ? { year: c.year - 1, month: 12 } : { year: c.year, month: c.month - 1 }));
  }
  function nextMonth() {
    setCursor((c) => (c.month === 12 ? { year: c.year + 1, month: 1 } : { year: c.year, month: c.month + 1 }));
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatTile label="Employees" value={employeeCount} />
        <StatTile label="Present today" value={presentToday} />
        <StatTile label="No update yet" value={noUpdateToday} />
        <StatTile label="On leave today" value={leaveToday} />
        <StatTile label="Absent today" value={absentToday} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Holidays</h2>
          <HolidayManager />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Calendar</h2>
          <MonthCalendar
            year={cursor.year}
            month={cursor.month}
            onPrev={prevMonth}
            onNext={nextMonth}
            entriesByDate={entriesByDate}
            legend={[{ type: "holiday", label: "Holiday" }]}
          />
        </section>
      </div>
    </div>
  );
}

function AttendanceForm() {
  const [employees, setEmployees] = useState([]);
  const [userId, setUserId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("Present");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/employees")
      .then((data) => {
        setEmployees(data.employees);
        if (data.employees[0]) setUserId(data.employees[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiFetch("/attendance/mark", {
        method: "POST",
        body: JSON.stringify({ userId, date, status }),
      });
      setMessage("Attendance recorded.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Employee</label>
          <select
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeId})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}

      <button
        type="submit"
        disabled={saving || !userId}
        className="mt-3 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Mark attendance"}
      </button>
    </form>
  );
}

function HolidayManager() {
  const [holidays, setHolidays] = useState([]);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const year = today().year;

  async function load() {
    try {
      const data = await apiFetch(`/holidays?year=${year}`);
      setHolidays(data.holidays);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/holidays", { method: "POST", body: JSON.stringify({ date, name }) });
      setDate("");
      setName("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      await apiFetch(`/holidays/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add holiday
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-slate-100 text-sm">
        {holidays.map((h) => (
          <li key={h._id} className="flex items-center justify-between py-2">
            <span>
              {new Date(h.date).toLocaleDateString()} — {h.name}
            </span>
            <button onClick={() => handleDelete(h._id)} className="text-red-600 underline">
              Remove
            </button>
          </li>
        ))}
        {holidays.length === 0 && <li className="py-2 text-slate-500">No holidays added for {year} yet.</li>}
      </ul>
    </div>
  );
}

function Attendance() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Mark Attendance</h2>
        <AttendanceForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Today&apos;s Work Updates</h2>
        <DailyUpdatesStatus />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Paid Leave Balances</h2>
        <LeaveBalancesPanel />
      </section>
    </div>
  );
}

function AdminConsole() {
  const [tab, setTab] = useState("overview");

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "attendance", label: "Attendance" },
    { key: "employees", label: "Employees" },
    { key: "interns", label: "Interns" },
    { key: "leave", label: "Leave Requests" },
  ];

  return (
    <>
      <AccountMenu />
      <main className="min-h-screen bg-slate-50 p-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-4 text-xl font-semibold text-slate-900">Admin Dashboard</h1>

          <div className="mb-6 flex items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded px-3 py-1.5 text-sm ${
                  tab === t.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <Overview />}
          {tab === "attendance" && <Attendance />}
          {tab === "employees" && <EmployeesSection />}
          {tab === "interns" && <InternsSection />}
          {tab === "leave" && <LeaveRequestsPanel />}
        </div>
      </main>
    </>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={["Admin"]}>
      <AdminConsole />
    </RoleGuard>
  );
}
