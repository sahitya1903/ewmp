"use client";

import { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import AttendanceOverview from "@/components/AttendanceOverview";
import LeaveRequestsPanel from "@/components/LeaveRequestsPanel";
import WorkUpdatesPanel from "@/components/WorkUpdatesPanel";
import EmployeesSection from "@/components/EmployeesSection";
import InternsSection from "@/components/InternsSection";
import SalariesSection from "@/components/SalariesSection";

function HrConsole() {
  const [tab, setTab] = useState("overview");

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "updates", label: "Work Updates" },
    { key: "employees", label: "Employees" },
    { key: "interns", label: "Interns" },
    { key: "salaries", label: "Salaries" },
    { key: "leave", label: "Leave Requests" },
  ];

  return (
    <>
      <AccountMenu />
      <main className="min-h-screen bg-slate-50 p-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-4 text-xl font-semibold text-slate-900">HR Dashboard</h1>

          <div className="mb-6 flex items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded px-3 py-1.5 text-sm ${
                  tab === t.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <AttendanceOverview />}
          {tab === "updates" && <WorkUpdatesPanel />}
          {tab === "leave" && <LeaveRequestsPanel />}
          {tab === "salaries" && <SalariesSection />}
          {tab === "employees" && <EmployeesSection showRoleManager />}
          {tab === "interns" && <InternsSection />}
        </div>
      </main>
    </>
  );
}

export default function HrPage() {
  return (
    <RoleGuard allowedRoles={["Management"]}>
      <HrConsole />
    </RoleGuard>
  );
}
