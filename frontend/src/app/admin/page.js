"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import AttendanceOverview from "@/components/AttendanceOverview";
import NoticeManager from "@/components/NoticeManager";
import LeaveRequestsPanel from "@/components/LeaveRequestsPanel";
import DailyUpdatesStatus from "@/components/DailyUpdatesStatus";
import LeaveBalancesPanel from "@/components/LeaveBalancesPanel";
import EmployeesSection from "@/components/EmployeesSection";
import InternsSection from "@/components/InternsSection";
import SalariesSection from "@/components/SalariesSection";
import { apiFetch } from "@/lib/api";

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
    { key: "notices", label: "Notices" },
    { key: "employees", label: "Employees" },
    { key: "interns", label: "Interns" },
    { key: "salaries", label: "Salaries" },
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

          {tab === "overview" && <AttendanceOverview />}
          {tab === "attendance" && <Attendance />}
          {tab === "notices" && <NoticeManager />}
          {tab === "employees" && <EmployeesSection />}
          {tab === "interns" && <InternsSection />}
          {tab === "salaries" && <SalariesSection />}
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
