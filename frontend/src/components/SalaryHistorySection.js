"use client";

import MonthYearPicker from "@/components/MonthYearPicker";
import SalaryHistoryPanel from "@/components/SalaryHistoryPanel";
import { useMonthYear } from "@/lib/useSalaries";

// Its own top-level tab, alongside Salaries — not nested inside it — so
// browsing credit history doesn't require first landing on the salary table.
// Shared by Accounts, HR, and Admin, same as SalariesSection.
export default function SalaryHistorySection() {
  const { month, setMonth, year, setYear } = useMonthYear();

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <MonthYearPicker month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
      </div>
      <SalaryHistoryPanel month={month} year={year} />
    </div>
  );
}
