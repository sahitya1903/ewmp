"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function LeaveBalancesPanel() {
  const [balances, setBalances] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/leave-requests/balances")
      .then((data) => setBalances(data.balances))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className="py-2 pr-4 font-medium">Employee</th>
                <th className="py-2 pr-4 font-medium">Accrued so far</th>
                <th className="py-2 pr-4 font-medium">Used</th>
                <th className="py-2 pr-4 font-medium">Remaining</th>
                <th className="py-2 pr-4 font-medium">Annual quota</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.user.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4">
                    {b.user.name} <span className="text-slate-400">({b.user.employeeId})</span>
                  </td>
                  <td className="py-2 pr-4">{b.accrued}</td>
                  <td className="py-2 pr-4">{b.used}</td>
                  <td className="py-2 pr-4">{b.remaining}</td>
                  <td className="py-2 pr-4 text-slate-500">{b.quota} / year</td>
                </tr>
              ))}
              {balances.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
