import RolePermission from "../models/RolePermission.js";
import { MODULE_KEYS } from "./modules.js";
import { isManagementRole } from "./roleCategory.js";

export async function getEnabledModules(role) {
  if (await isManagementRole(role)) return MODULE_KEYS;
  const doc = await RolePermission.findOne({ role });
  return doc ? doc.enabledModules : MODULE_KEYS;
}
