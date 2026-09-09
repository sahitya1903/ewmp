"use client";

import RoleGuard from "@/components/RoleGuard";
import ManagementConsole from "@/components/ManagementConsole";

export default function AccountsPage() {
  return (
    <RoleGuard allowedRoles={["Accounts_E"]}>
      <ManagementConsole title="Accounts Dashboard" />
    </RoleGuard>
  );
}
