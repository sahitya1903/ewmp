import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={["Admin"]}>
      <AccountMenu />
      <main className="p-10">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Placeholder for Admin — mark absent, view/manage leave requests, calendar go here (Phase 3).
        </p>
      </main>
    </RoleGuard>
  );
}