"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import AttendanceOverview from "@/components/AttendanceOverview";
import LeaveRequestsPanel from "@/components/LeaveRequestsPanel";
import WorkUpdatesPanel from "@/components/WorkUpdatesPanel";
import PaidLeavesSection from "@/components/PaidLeavesSection";
import EmployeesSection from "@/components/EmployeesSection";
import InternsSection from "@/components/InternsSection";
import SalariesSection from "@/components/SalariesSection";
import SalaryHistorySection from "@/components/SalaryHistorySection";
import { apiFetch } from "@/lib/api";
import { HR_CAPABILITY_KEYS } from "@/lib/hrCapabilities";

// Same relative order as Admin and Accounts: overview, daily ops, people,
// money, then leave — each page just shows whichever subset applies to it.
// Every tab but "overview" maps to a console capability Admin can switch off
// for HR (see the Access Control panel); Employees and Interns share one
// capability since they're backed by the same API.
const ALL_TABS = [
  { key: "overview", label: "Overview", capability: "overview" },
  { key: "updates", label: "Work Updates", capability: "workUpdates" },
  { key: "employees", label: "Employees", capability: "employees" },
  { key: "interns", label: "Interns", capability: "employees" },
  { key: "salaries", label: "Salaries", capability: "salaries" },
  { key: "salaryHistory", label: "Salary History", capability: "salaryHistory" },
  { key: "leaves", label: "Paid Leaves", capability: "paidLeaves" },
  { key: "leave", label: "Leave Requests", capability: "leaveRequests" },
];

function HrConsole() {
  // Defaults to fully enabled so nothing flashes hidden while this loads;
  // corrected as soon as Admin's HR Console Access settings come back.
  const [enabledCapabilities, setEnabledCapabilities] = useState(HR_CAPABILITY_KEYS);
  const [tab, setTab] = useState("overview");

  const TABS = ALL_TABS.filter((t) => enabledCapabilities.includes(t.capability));
  // If Admin has switched off whatever tab was selected (or the default
  // "overview"), fall back to the first tab HR actually still has — computed
  // at render time rather than corrected after the fact via an effect.
  const activeTab = TABS.some((t) => t.key === tab) ? tab : TABS[0]?.key;

  useEffect(() => {
    apiFetch("/hr-capabilities/mine")
      .then((data) => setEnabledCapabilities(data.enabledCapabilities))
      .catch(() => setEnabledCapabilities(HR_CAPABILITY_KEYS));
  }, []);

  return (
    <>
      <AccountMenu />
      <main className="min-h-screen bg-slate-50 p-4 sm:p-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-4 text-xl font-semibold text-slate-900">HR Dashboard</h1>

          <div className="mb-6 flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded px-3 py-1.5 text-sm ${
                  activeTab === t.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && <AttendanceOverview />}
          {activeTab === "updates" && <WorkUpdatesPanel />}
          {activeTab === "leave" && <LeaveRequestsPanel />}
          {activeTab === "salaries" && <SalariesSection />}
          {activeTab === "salaryHistory" && <SalaryHistorySection />}
          {activeTab === "leaves" && <PaidLeavesSection />}
          {activeTab === "employees" && (
            <EmployeesSection showRoleManager={enabledCapabilities.includes("manageRoles")} />
          )}
          {activeTab === "interns" && <InternsSection />}
        </div>
      </main>
    </>
  );
}

export default function HrPage() {
  return (
    <RoleGuard allowedRoles={["HR"]}>
      <HrConsole />
    </RoleGuard>
  );
}
