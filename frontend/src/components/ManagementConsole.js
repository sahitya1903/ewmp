"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import AccountMenu from "@/components/AccountMenu";
import AttendanceOverview from "@/components/AttendanceOverview";
import WorkUpdatesPanel from "@/components/WorkUpdatesPanel";
import LeaveRequestsPanel from "@/components/LeaveRequestsPanel";
import SalariesSection from "@/components/SalariesSection";
import SalaryHistorySection from "@/components/SalaryHistorySection";
import PaidLeavesSection from "@/components/PaidLeavesSection";
import EmployeesSection from "@/components/EmployeesSection";
import InternsSection from "@/components/InternsSection";
import NoticeBoard from "@/components/NoticeBoard";
import { MANAGEMENT_CAPABILITY_KEYS } from "@/lib/managementCapabilities";

// Shared by HR, Accounts, and any custom management role's console (Admin
// keeps its own page — it also gets attendance-marking, notices, and Access
// Control, none of which are delegable). Which tabs show up is driven
// entirely by the role's granted capabilities, fetched here.
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

export default function ManagementConsole({ title }) {
  // Defaults to fully enabled so nothing flashes hidden while this loads;
  // corrected as soon as Admin's Management Role Capabilities settings come back.
  const [enabledCapabilities, setEnabledCapabilities] = useState(MANAGEMENT_CAPABILITY_KEYS);
  const [tab, setTab] = useState("overview");

  const TABS = ALL_TABS.filter((t) => enabledCapabilities.includes(t.capability));
  // If the active tab isn't available (capabilities not loaded yet, or
  // Admin switched one off), fall back to the first tab this role has —
  // computed at render time rather than corrected after the fact via an effect.
  const activeTab = TABS.some((t) => t.key === tab) ? tab : TABS[0]?.key;

  useEffect(() => {
    apiFetch("/management-capabilities/mine")
      .then((data) => setEnabledCapabilities(data.enabledCapabilities))
      .catch(() => setEnabledCapabilities([]));
  }, []);

  return (
    <>
      <AccountMenu />
      <main className="min-h-screen bg-slate-50 px-3 py-6 sm:px-6">
        <div className="w-full">
          <h1 className="mb-4 text-xl font-semibold text-slate-900">{title}</h1>

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

          {TABS.length === 0 ? (
            <p className="text-sm text-slate-600">
              No features are enabled for your role yet — ask an Admin to grant access.
            </p>
          ) : (
            <>
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
            </>
          )}

          {/* The Overview tab (AttendanceOverview) already shows Notices & Meetings;
              only render it here for the other tabs so it isn't duplicated. */}
          {activeTab !== "overview" && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Notices &amp; Meetings</h2>
              <NoticeBoard />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
