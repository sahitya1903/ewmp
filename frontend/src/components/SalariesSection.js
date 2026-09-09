"use client";

import StatTile from "@/components/StatTile";
import SalaryTable from "@/components/SalaryTable";
import MonthYearPicker from "@/components/MonthYearPicker";
import { currency, MONTH_NAMES } from "@/lib/format";
import { useMonthYear, useSalaries } from "@/lib/useSalaries";

// Shared by Accounts, HR, and Admin so all three see and act on salaries the
// same way — recording a payment is common to all three roles. Salary History
// is its own separate top-level tab now (see SalaryHistorySection), not
// nested inside this one.
export default function SalariesSection() {
  const { month, setMonth, year, setYear } = useMonthYear();
  const { salaries, loading, error, reload } = useSalaries(month, year);

  const totalExpense = salaries.reduce((sum, s) => sum + s.salaryPayable, 0);
  const creditedCount = salaries.filter((s) => s.credited).length;

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <MonthYearPicker month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
      </div>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,240px))] gap-4">
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
    </div>
  );
}
