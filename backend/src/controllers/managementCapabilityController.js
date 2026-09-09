import ManagementCapability from "../models/ManagementCapability.js";
import CustomRole from "../models/CustomRole.js";
import {
  MANAGEMENT_CAPABILITIES,
  MANAGEMENT_CAPABILITY_KEYS,
  MANAGEMENT_ROLES,
  DEFAULT_MANAGEMENT_CAPABILITIES,
} from "../lib/managementCapabilities.js";
import { getEnabledManagementCapabilities } from "../lib/managementAccess.js";
import { isManagementRole } from "../lib/roleCategory.js";

// HR/Accounts plus any custom management-category role Admin has added —
// everyone this panel can configure.
async function configurableManagementRoles() {
  const customManagement = await CustomRole.find({ category: "management" }).select("name");
  return [...MANAGEMENT_ROLES, ...customManagement.map((r) => r.name)];
}

export async function listCapabilities(req, res) {
  const roles = await configurableManagementRoles();
  const docs = await ManagementCapability.find({ role: { $in: roles } });
  const byRole = new Map(docs.map((d) => [d.role, d.enabledCapabilities]));

  const roleCapabilities = roles.map((role) => ({
    role,
    enabledCapabilities: byRole.get(role) ?? (DEFAULT_MANAGEMENT_CAPABILITIES[role] ?? []),
  }));

  res.json({ capabilities: MANAGEMENT_CAPABILITIES, roleCapabilities });
}

export async function updateCapabilities(req, res) {
  const { role } = req.params;
  const { enabledCapabilities } = req.body;

  if (!Array.isArray(enabledCapabilities) || enabledCapabilities.some((c) => !MANAGEMENT_CAPABILITY_KEYS.includes(c))) {
    return res.status(400).json({ error: "enabledCapabilities must be a list of valid capability keys" });
  }

  const roles = await configurableManagementRoles();
  if (!roles.includes(role)) {
    return res.status(404).json({ error: "Unknown management role" });
  }

  const doc = await ManagementCapability.findOneAndUpdate(
    { role },
    { enabledCapabilities },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  res.json({ role: doc.role, enabledCapabilities: doc.enabledCapabilities });
}

export async function getMyCapabilities(req, res) {
  if (!(await isManagementRole(req.user.role)) || req.user.role === "Admin") {
    return res.json({ enabledCapabilities: MANAGEMENT_CAPABILITY_KEYS });
  }
  const enabledCapabilities = await getEnabledManagementCapabilities(req.user.role);
  res.json({ enabledCapabilities });
}
