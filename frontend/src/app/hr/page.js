"use client";

import RoleGuard from "@/components/RoleGuard";
import ManagementConsole from "@/components/ManagementConsole";

export default function HrPage() {
  return (
    <RoleGuard allowedRoles={["HR"]}>
      <ManagementConsole title="HR Dashboard" />
    </RoleGuard>
  );
}
