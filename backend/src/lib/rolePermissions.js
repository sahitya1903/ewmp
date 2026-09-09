import RolePermission from "../models/RolePermission.js";
import { MODULE_KEYS, UNRESTRICTED_ROLES } from "./modules.js";

export async function getEnabledModules(role) {
  if (UNRESTRICTED_ROLES.includes(role)) return MODULE_KEYS;
  const doc = await RolePermission.findOne({ role });
  return doc ? doc.enabledModules : MODULE_KEYS;
}
