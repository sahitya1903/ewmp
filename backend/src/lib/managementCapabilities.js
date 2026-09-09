// Console features Admin can grant or revoke per management role (HR or
// Accounts_E — they have similar permission shapes, so they're configured
// together in one table). Admin itself always has full access and isn't
// configurable here.
export const MANAGEMENT_CAPABILITIES = [
  { key: "overview", label: "Overview" },
  { key: "workUpdates", label: "Work Updates" },
  { key: "employees", label: "Employees & Interns" },
  { key: "salaries", label: "Salaries" },
  { key: "salaryHistory", label: "Salary History" },
  { key: "paidLeaves", label: "Paid Leaves" },
  { key: "leaveRequests", label: "Leave Requests" },
  { key: "manageRoles", label: "Add Custom Roles" },
];

export const MANAGEMENT_CAPABILITY_KEYS = MANAGEMENT_CAPABILITIES.map((c) => c.key);

export const MANAGEMENT_ROLES = ["HR", "Accounts_E"];

// Preserves today's behavior for both roles until Admin explicitly changes
// something: HR already has every tab, Accounts only has these three.
export const DEFAULT_MANAGEMENT_CAPABILITIES = {
  HR: [...MANAGEMENT_CAPABILITY_KEYS],
  Accounts_E: ["salaries", "salaryHistory", "paidLeaves"],
};
