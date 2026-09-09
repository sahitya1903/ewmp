// The built-in roles. Admin/HR can add more at runtime (see the
// CustomRole model); a user's role is any of these plus any custom name.
export const ROLE_NAMES = [
  "Developer_E",
  "Cyber Security_E",
  "Social Media & Performance Marketing_E",
  "Accounts_E",
  "Admin",
  "HR",
  "Intern",
];

// Roles that can see/manage data across all employees, not just their own.
export const REVIEWER_ROLES = ["Admin", "HR"];

// Roles with their own dedicated console rather than the plain-employee
// /dashboard. They never submit a daily work update — their attendance is
// marked on login instead (see authController.me) — and are excluded from
// the "who's submitted today" roster/counter.
export const NO_DASHBOARD_ROLES = ["Admin", "HR", "Accounts_E"];
