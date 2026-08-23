import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";

export default function AccountsPage() {
  return (
    <RoleGuard allowedRoles={["Accounts_E"]}>
      <AccountMenu />
      <main className="p-10">
        <h1 className="text-xl font-semibold">Accounts Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Placeholder for Accounts_E — salary details, credited checkbox, company expense overview go here (Phase 4).
        </p>
      </main>
    </RoleGuard>
  );
}