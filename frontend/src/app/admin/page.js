"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import AttendanceOverview from "@/components/AttendanceOverview";
import NoticeManager from "@/components/NoticeManager";
import LeaveRequestsPanel from "@/components/LeaveRequestsPanel";
import WorkUpdatesPanel from "@/components/WorkUpdatesPanel";
import PaidLeavesSection from "@/components/PaidLeavesSection";
import EmployeesSection from "@/components/EmployeesSection";
import InternsSection from "@/components/InternsSection";
import SalariesSection from "@/components/SalariesSection";
import SalaryHistorySection from "@/components/SalaryHistorySection";
import AccessControlPanel from "@/components/AccessControlPanel";
import HrCapabilitiesPanel from "@/components/HrCapabilitiesPanel";
import { toDateKey } from "@/components/MonthCalendar";
import { today } from "@/lib/month";
import { apiFetch } from "@/lib/api";

function AttendanceForm() {
  const [employees, setEmployees] = useState([]);
  const [userId, setUserId] = useState("");
  // Defaults to today — the day Admin is almost always marking — and can't go
  // past it, matching the backend's "no future-dated attendance" rule.
  const [date, setDate] = useState(() => toDateKey(today()));
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
            max={toDateKey(today())}
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
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Mark Attendance</h2>
      <AttendanceForm />
    </section>
  );
}

function AdminConsole() {
  const [tab, setTab] = useState("overview");

  // Same relative order as HR and Accounts: overview, daily ops, people,
  // money, then leave — each page just shows whichever subset applies to it.
  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "attendance", label: "Attendance" },
    { key: "updates", label: "Work Updates" },
    { key: "notices", label: "Notices" },
    { key: "employees", label: "Employees" },
    { key: "interns", label: "Interns" },
    { key: "salaries", label: "Salaries" },
    { key: "salaryHistory", label: "Salary History" },
    { key: "leaves", label: "Paid Leaves" },
    { key: "leave", label: "Leave Requests" },
    { key: "access", label: "Access Control" },
  ];

  return (
    <>
      <AccountMenu />
      <main className="min-h-screen bg-slate-50 p-4 sm:p-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-4 text-xl font-semibold text-slate-900">Admin Dashboard</h1>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded px-3 py-1.5 text-sm ${
                  tab === t.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <AttendanceOverview />}
          {tab === "attendance" && <Attendance />}
          {tab === "updates" && <WorkUpdatesPanel />}
          {tab === "notices" && <NoticeManager />}
          {tab === "employees" && <EmployeesSection showRoleManager />}
          {tab === "interns" && <InternsSection />}
          {tab === "salaries" && <SalariesSection />}
          {tab === "salaryHistory" && <SalaryHistorySection />}
          {tab === "leaves" && <PaidLeavesSection />}
          {tab === "leave" && <LeaveRequestsPanel />}
          {tab === "access" && (
            <div className="space-y-6">
              <AccessControlPanel />
              <HrCapabilitiesPanel />
            </div>
          )}
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
