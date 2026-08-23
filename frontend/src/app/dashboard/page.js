import RoleGuard from "@/components/RoleGuard";

export default function DashboardPage() {
  return (
    <RoleGuard allowedRoles={["Developer_E", "Cyber Security_E", "Social Media & Performance Marketing_E"]}>
      <main className="p-10">
        <h1 className="text-xl font-semibold">Employee Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Placeholder for Developer_E / Cyber Security_E / Social Media &amp; Performance Marketing_E — daily work updates, leave, notifications, calendar go here (Phase 2).
        </p>
      </main>
    </RoleGuard>
  );
}