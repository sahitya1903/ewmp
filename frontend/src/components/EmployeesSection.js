"use client";

import PeopleManager from "@/components/PeopleManager";
import RoleManager from "@/components/RoleManager";
import { useRoles } from "@/lib/useRoles";

// Adding/editing/removing employees is common to Admin and HR, as is role
// management (showRoleManager) — see admin/page.js and hr/page.js.
export default function EmployeesSection({ showRoleManager = false }) {
  const { roles, loading } = useRoles();
  const employeeRoleOptions = roles.filter((role) => role !== "Intern");

  return (
    <div className="space-y-6">
      {showRoleManager && <RoleManager />}
      {loading ? (
        <p className="text-sm text-slate-600">Loading roles...</p>
      ) : (
        <PeopleManager
          heading="Employees"
          addButtonLabel="Add employee"
          roleOptions={employeeRoleOptions}
          filterPredicate={(emp) => emp.role !== "Intern"}
        />
      )}
    </div>
  );
}
