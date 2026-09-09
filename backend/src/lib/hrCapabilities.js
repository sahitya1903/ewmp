// Console features Admin can grant or revoke for the HR role specifically.
// Admin always has all of these; only HR is ever restricted by this list.
export const HR_CAPABILITIES = [
  { key: "overview", label: "Overview" },
  { key: "workUpdates", label: "Work Updates" },
  { key: "employees", label: "Employees & Interns" },
  { key: "salaries", label: "Salaries" },
  { key: "salaryHistory", label: "Salary History" },
  { key: "paidLeaves", label: "Paid Leaves" },
  { key: "leaveRequests", label: "Leave Requests" },
  { key: "manageRoles", label: "Add Custom Roles" },
];

export const HR_CAPABILITY_KEYS = HR_CAPABILITIES.map((c) => c.key);
