"use client";

import { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import SalariesSection from "@/components/SalariesSection";
import SalaryHistorySection from "@/components/SalaryHistorySection";
import PaidLeavesSection from "@/components/PaidLeavesSection";
import NoticeBoard from "@/components/NoticeBoard";

// Flattened to exactly these three — no nested tab-within-a-tab, no separate
// "Overview" wrapper. Salaries/Salary History are the same shared components
// Admin and HR use, each with its own month/year picker. Same relative order
// as Admin and HR: money tabs, then Paid Leaves.
const TABS = [
  { key: "salaries", label: "Salaries" },
  { key: "salaryHistory", label: "Salary History" },
  { key: "leaves", label: "Paid Leaves" },
];

function AccountsConsole() {
  const [tab, setTab] = useState("salaries");

  return (
    <>
      <AccountMenu />
      <main className="min-h-screen bg-slate-50 p-4 sm:p-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-4 text-xl font-semibold text-slate-900">Accounts Dashboard</h1>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded px-3 py-1.5 text-sm ${
                  tab === t.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "salaries" && <SalariesSection />}
          {tab === "salaryHistory" && <SalaryHistorySection />}

          {tab === "leaves" && <PaidLeavesSection />}

          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Notices &amp; Meetings</h2>
            <NoticeBoard />
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
