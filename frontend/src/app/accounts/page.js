"use client";

import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import SalariesSection from "@/components/SalariesSection";
import LeaveBalancesPanel from "@/components/LeaveBalancesPanel";
import NoticeBoard from "@/components/NoticeBoard";

function AccountsConsole() {
  return (
    <>
      <AccountMenu />
      <main className="min-h-screen bg-slate-50 p-4 sm:p-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <h1 className="text-xl font-semibold text-slate-900">Accounts Dashboard</h1>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Notices &amp; Meetings</h2>
            <NoticeBoard />
          </div>

          <SalariesSection />

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
