"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import LeaveRequestsPanel from "@/components/LeaveRequestsPanel";
import StatTile from "@/components/StatTile";
import BarList from "@/components/BarList";
import SalaryTable from "@/components/SalaryTable";
import MonthYearPicker from "@/components/MonthYearPicker";
import EmployeesSection from "@/components/EmployeesSection";
import InternsSection from "@/components/InternsSection";
import LeaveBalancesPanel from "@/components/LeaveBalancesPanel";
import { getRoleColor } from "@/lib/chartColors";
import { apiFetch } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/roles";
import { currency, MONTH_NAMES } from "@/lib/format";
import { useMonthYear, useSalaries } from "@/lib/useSalaries";

function Overview() {
  const [employeesByRole, setEmployeesByRole] = useState({});
  const [salaryByRole, setSalaryByRole] = useState({});
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    Promise.all([
      apiFetch("/employees"),
      apiFetch(`/salaries?month=${month}&year=${year}`),
      apiFetch("/leave-requests?status=Pending"),
    ])
      .then(([employeesData, salariesData, leaveData]) => {
        const roleHeadcount = {};
        for (const emp of employeesData.employees) {
          roleHeadcount[emp.role] = (roleHeadcount[emp.role] ?? 0) + 1;
        }
        setEmployeesByRole(roleHeadcount);
        setTotalEmployees(employeesData.employees.length);

        const roleSalary = {};
        let total = 0;
        for (const s of salariesData.salaries) {
          roleSalary[s.user.role] = (roleSalary[s.user.role] ?? 0) + s.salaryPayable;
          total += s.salaryPayable;
        }
        setSalaryByRole(roleSalary);
        setTotalExpense(total);

        setPendingLeave(leaveData.leaveRequests.length);
      })
      .catch((err) => setError(err.message));
  }, []);

  const roleRows = (source) =>
    Object.keys(source)
      .filter((role) => source[role])
      .map((role) => ({
        label: ROLE_LABELS[role] ?? role,
        value: source[role],
        color: getRoleColor(role),
      }));

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Employees" value={totalEmployees} />
        <StatTile
          label="Salary expense"
          value={currency(totalExpense)}
          sub={new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        />
        <StatTile label="Pending leave requests" value={pendingLeave} />
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-medium text-slate-500">Employees by role</h3>
          <BarList data={roleRows(employeesByRole)} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-medium text-slate-500">Salary expense by role (this month)</h3>
          <BarList data={roleRows(salaryByRole)} formatValue={currency} />
        </div>
      </div>

      <h3 className="mb-3 text-xs font-medium text-slate-500">Paid leave balances</h3>
      <LeaveBalancesPanel />
    </div>
  );
}

function Salaries() {
  const { month, setMonth, year, setYear } = useMonthYear();
  const { salaries, loading, error } = useSalaries(month, year);

  const totalExpense = salaries.reduce((sum, s) => sum + s.salaryPayable, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Salaries</h2>
        <MonthYearPicker month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          label="Total salary expense"
          value={currency(totalExpense)}
          sub={`${MONTH_NAMES[month - 1]} ${year}`}
        />
        <StatTile label="Employees" value={salaries.length} />
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? <p className="text-sm text-slate-600">Loading...</p> : <SalaryTable salaries={salaries} />}
    </div>
  );
}

function HrConsole() {
  const [tab, setTab] = useState("overview");

  const TABS = [
    { key: "overview", label: "Overview" },
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
          <h1 className="mb-4 text-xl font-semibold text-slate-900">HR Dashboard</h1>

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
          {tab === "leave" && <LeaveRequestsPanel />}
          {tab === "salaries" && <Salaries />}
          {tab === "employees" && <EmployeesSection showRoleManager />}
          {tab === "interns" && <InternsSection />}
        </div>
      </main>
    </>
  );
}

export default function HrPage() {
  return (
    <RoleGuard allowedRoles={["Management"]}>
      <HrConsole />
    </RoleGuard>
  );
}
