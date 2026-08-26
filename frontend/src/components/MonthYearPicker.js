"use client";

import { MONTH_NAMES } from "@/lib/format";

export default function MonthYearPicker({ month, year, onMonthChange, onYearChange }) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) => onMonthChange(Number(e.target.value))}
        className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
      >
        {MONTH_NAMES.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
      />
    </div>
  );
}
