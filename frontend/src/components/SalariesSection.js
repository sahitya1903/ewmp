"use client";

import { useState } from "react";
import StatTile from "@/components/StatTile";
import SalaryTable from "@/components/SalaryTable";
import SalaryHistoryPanel from "@/components/SalaryHistoryPanel";
import MonthYearPicker from "@/components/MonthYearPicker";
import { currency, MONTH_NAMES } from "@/lib/format";
import { useMonthYear, useSalaries } from "@/lib/useSalaries";

const TABS = [
  { key: "salaries", label: "Salaries" },
  { key: "history", label: "Salary History" },
];

// Shared by Accounts, HR, and Admin so all three see and act on salaries the
// same way — recording a payment is common to all three roles.
export default function SalariesSection() {
  const { month, setMonth, year, setYear } = useMonthYear();
  const { salaries, loading, error, reload } = useSalaries(month, year);
  const [tab, setTab] = useState("salaries");

  const totalExpense = salaries.reduce((sum, s) => sum + s.salaryPayable, 0);
  const creditedCount = salaries.filter((s) => s.credited).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
        <MonthYearPicker month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
      </div>

      {tab === "salaries" ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Total salary expense"
              value={currency(totalExpense)}
              sub={`${MONTH_NAMES[month - 1]} ${year}`}
            />
            <StatTile label="Employees" value={salaries.length} />
            <StatTile label="Credited" value={`${creditedCount} / ${salaries.length}`} />
          </div>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="text-sm text-slate-600">Loading...</p>
          ) : (
            <SalaryTable salaries={salaries} canEditCredited onChanged={reload} />
          )}
        </>
      ) : (
        <SalaryHistoryPanel month={month} year={year} />
      )}
    </div>
  );
}
