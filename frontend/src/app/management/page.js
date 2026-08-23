import RoleGuard from "@/components/RoleGuard";

export default function ManagementPage() {
  return (
    <RoleGuard allowedRoles={["Management"]}>
      <main className="p-10">
        <h1 className="text-xl font-semibold">Management Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Placeholder for Management (HR) — approve/reject leave, add/edit/delete employees go here (Phase 1 &amp; 3).
        </p>
      </main>
    </RoleGuard>
  );
}