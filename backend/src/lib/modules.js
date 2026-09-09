import { NO_DASHBOARD_ROLES } from "./roles.js";

// Feature areas that a plain employee role can be granted or denied access
// to, via the RolePermission model. Roles with their own console (Admin, HR,
// Accounts_E) always have full access — this panel only restricts /dashboard roles.
export const MODULES = [
  { key: "dailyWorkUpdate", label: "Daily Work Updates" },
  { key: "leave", label: "Leave Requests" },
  { key: "attendance", label: "Attendance & Calendar" },
  { key: "salary", label: "Salary" },
  { key: "notices", label: "Notices & Meetings" },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);

export const UNRESTRICTED_ROLES = NO_DASHBOARD_ROLES;
