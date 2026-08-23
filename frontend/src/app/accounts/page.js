import RoleGuard from "@/components/RoleGuard";

export default function AccountsPage() {
  return (
    <RoleGuard allowedRoles={["Accounts_E"]}>
      <main className="p-10">
        <h1 className="text-xl font-semibold">Accounts Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Placeholder for Accounts_E — salary details, credited checkbox, company expense overview go here (Phase 4).
        </p>
      </main>
    </RoleGuard>
  );
}