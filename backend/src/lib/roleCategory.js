import CustomRole from "../models/CustomRole.js";
import { NO_DASHBOARD_ROLES } from "./roles.js";

// Built-in management roles (Admin/HR/Accounts_E) are always "management";
// anything else is looked up on CustomRole, defaulting to "employee" if
// somehow not found (defensive — every custom role is created with one).
export async function getRoleCategory(role) {
  if (NO_DASHBOARD_ROLES.includes(role)) return "management";
  const custom = await CustomRole.findOne({ name: role }).select("category");
  return custom?.category ?? "employee";
}

export async function isManagementRole(role) {
  return (await getRoleCategory(role)) === "management";
}
