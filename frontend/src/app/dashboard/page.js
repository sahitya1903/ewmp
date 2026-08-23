import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";

export default function DashboardPage() {
  return (
    <RoleGuard allowedRoles={["Developer_E", "Cyber Security_E", "Social Media & Performance Marketing_E"]}>
      <AccountMenu />
      <main className="min-h-screen bg-slate-50 p-10">
        <h1 className="text-xl font-semibold text-slate-900">Employee Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Placeholder for Developer_E / Cyber Security_E / Social Media &amp; Performance Marketing_E — daily work updates, leave, notifications, calendar go here (Phase 2).
        </p>
      </main>
    </RoleGuard>
  );
}
