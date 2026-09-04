"use client";

import LeaveBalancesPanel from "@/components/LeaveBalancesPanel";

// Its own top-level "Paid Leaves" tab — shared by Admin, HR, and Accounts —
// so cross-checking a paid-leave balance doesn't require digging through
// Attendance or Leave Requests first.
export default function PaidLeavesSection() {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Paid Leave Balances</h2>
      <p className="mb-3 text-xs text-slate-500">
        Everyone&apos;s accrued, used, and remaining paid leave — cross-check against the Salaries tab when a
        deduction looks off.
      </p>
      <LeaveBalancesPanel />
    </div>
  );
}
