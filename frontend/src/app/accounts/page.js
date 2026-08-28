"use client";

import { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import StatTile from "@/components/StatTile";
import SalaryTable from "@/components/SalaryTable";
import MonthYearPicker from "@/components/MonthYearPicker";
import LeaveBalancesPanel from "@/components/LeaveBalancesPanel";
import { currency, MONTH_NAMES } from "@/lib/format";
import { useMonthYear, useSalaries } from "@/lib/useSalaries";
import { apiFetch } from "@/lib/api";

function AccountsConsole() {
  const { month, setMonth, year, setYear } = useMonthYear();
  const { salaries, loading, error: loadError, reload } = useSalaries(month, year);
  const [savingId, setSavingId] = useState(null);
  const [actionError, setActionError] = useState("");

  async function toggleCredited(salary) {
    setSavingId(salary.id);
    setActionError("");
    try {
      await apiFetch(`/salaries/${salary.id}/credit`, {
        method: "PATCH",
        body: JSON.stringify({ credited: !salary.credited }),
      });
      await reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  const totalExpense = salaries.reduce((sum, s) => sum + s.salaryPayable, 0);
  const creditedCount = salaries.filter((s) => s.credited).length;

  return (
    <>
      <AccountMenu />
      <main className="min-h-screen bg-slate-50 p-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-900">Accounts Dashboard</h1>
            <MonthYearPicker month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Total salary expense"
              value={currency(totalExpense)}
              sub={`${MONTH_NAMES[month - 1]} ${year}`}
            />
            <StatTile label="Employees" value={salaries.length} />
            <StatTile label="Credited" value={`${creditedCount} / ${salaries.length}`} />
          </div>

          {(loadError || actionError) && <p className="text-sm text-red-600">{loadError || actionError}</p>}

          {loading ? (
            <p className="text-sm text-slate-600">Loading...</p>
          ) : (
            <SalaryTable
              salaries={salaries}
              canEditCredited
              onToggleCredited={toggleCredited}
              savingId={savingId}
            />
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Paid Leave Balances</h2>
            <p className="mb-3 text-xs text-slate-500">
              Cross-check paid-leave usage against deductions above.
            </p>
            <LeaveBalancesPanel />
          </div>
        </div>
      </main>
    </>
  );
}

export default function AccountsPage() {
  return (
    <RoleGuard allowedRoles={["Accounts_E"]}>
      <AccountsConsole />
    </RoleGuard>
  );
}
