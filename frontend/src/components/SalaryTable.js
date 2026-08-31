"use client";

import { useState } from "react";
import { currency } from "@/lib/format";
import SalaryPaymentDialog from "@/components/SalaryPaymentDialog";

export default function SalaryTable({ salaries, canEditCredited = false, onChanged }) {
  const [dialogSalary, setDialogSalary] = useState(null);

  function handleCredited() {
    setDialogSalary(null);
    onChanged?.();
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Employee</th>
              <th className="px-4 py-2 font-medium">Working days</th>
              <th className="px-4 py-2 font-medium">Present</th>
              <th className="px-4 py-2 font-medium">Paid leave</th>
              <th className="px-4 py-2 font-medium">Unpaid leave</th>
              <th className="px-4 py-2 font-medium">Absent</th>
              <th className="px-4 py-2 font-medium">Base salary</th>
              <th className="px-4 py-2 font-medium">Deduction</th>
              <th className="px-4 py-2 font-medium">Salary payable</th>
              {canEditCredited && <th className="px-4 py-2 font-medium">Payment</th>}
              {canEditCredited && <th className="px-4 py-2 font-medium">Remark</th>}
            </tr>
          </thead>
          <tbody>
            {salaries.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  {s.user.name} <span className="text-slate-400">({s.user.employeeId})</span>
                </td>
                <td className="px-4 py-2">{s.workingDays}</td>
                <td className="px-4 py-2">{s.presentDays}</td>
                <td className="px-4 py-2">{s.paidLeaveDays}</td>
                <td className="px-4 py-2">{s.unpaidLeaveDays}</td>
                <td className="px-4 py-2">{s.absentDays}</td>
                <td className="px-4 py-2">{currency(s.monthlySalary)}</td>
                <td className="px-4 py-2 text-red-600">{s.deduction > 0 ? `-${currency(s.deduction)}` : currency(0)}</td>
                <td className="px-4 py-2 font-medium">{currency(s.salaryPayable)}</td>
                {canEditCredited && (
                  <td className="px-4 py-2">
                    {s.credited ? (
                      <div className="text-xs text-slate-600">
                        <div className="font-medium text-emerald-700">✓ Credited {currency(s.amountCredited)}</div>
                        <button
                          onClick={() => setDialogSalary(s)}
                          className="mt-1 text-slate-500 underline hover:text-slate-700"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDialogSalary(s)}
                        className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Mark as credited
                      </button>
                    )}
                  </td>
                )}
                {canEditCredited && (
                  <td className="px-4 py-2 text-xs text-slate-600">{s.remark || <span className="text-slate-300">—</span>}</td>
                )}
              </tr>
            ))}
            {salaries.length === 0 && (
              <tr>
                <td colSpan={canEditCredited ? 11 : 9} className="px-4 py-6 text-center text-slate-500">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogSalary && (
        <SalaryPaymentDialog salary={dialogSalary} onClose={() => setDialogSalary(null)} onCredited={handleCredited} />
      )}
    </>
  );
}
