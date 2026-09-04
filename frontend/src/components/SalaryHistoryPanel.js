"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { currency, formatDateDMY, MONTH_NAMES } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";

const ACTION_LABEL = {
  credited: "Credited",
  revised: "Revised",
  uncredited: "Marked not credited",
};

function formatDateTime(value) {
  if (!value) return "—";
  const time = new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${formatDateDMY(value)}, ${time}`;
}

// Combined salary credit history for every employee in the selected month.
export default function SalaryHistoryPanel({ month, year }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    apiFetch(`/salaries/history?month=${month}&year=${year}`)
      .then((data) => setHistory(data.history))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [month, year]);

  if (loading) return <p className="text-sm text-slate-600">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-2 font-medium">Employee</th>
            <th className="px-4 py-2 font-medium">Action</th>
            <th className="px-4 py-2 font-medium">Amount</th>
            <th className="px-4 py-2 font-medium">By</th>
            <th className="px-4 py-2 font-medium">When</th>
            <th className="px-4 py-2 font-medium">Remark</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-4 py-2">
                {h.user ? (
                  <>
                    {h.user.name} <span className="text-slate-400">({h.user.employeeId})</span>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2">
                <span className={h.action === "revised" ? "text-amber-700" : "text-slate-700"}>
                  {ACTION_LABEL[h.action] ?? h.action}
                </span>
              </td>
              <td className="px-4 py-2">
                {h.amount != null && h.action !== "uncredited" ? currency(h.amount) : "—"}
              </td>
              <td className="px-4 py-2">
                {h.by ? (
                  <>
                    {h.by.name}
                    {h.by.role && <span className="text-slate-400"> ({ROLE_LABELS[h.by.role] ?? h.by.role})</span>}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-slate-600">{formatDateTime(h.at)}</td>
              <td className="px-4 py-2 text-slate-600">
                {h.remark || <span className="text-slate-300">—</span>}
              </td>
            </tr>
          ))}
          {history.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                No salary credit activity for {MONTH_NAMES[month - 1]} {year}.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
