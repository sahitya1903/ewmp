import RolePermission from "../models/RolePermission.js";
import CustomRole from "../models/CustomRole.js";
import { ROLE_NAMES } from "../lib/roles.js";
import { MODULES, MODULE_KEYS, UNRESTRICTED_ROLES } from "../lib/modules.js";
import { getEnabledModules } from "../lib/rolePermissions.js";

async function configurableRoles() {
  const custom = await CustomRole.find().select("name");
  return [...ROLE_NAMES, ...custom.map((r) => r.name)].filter((r) => !UNRESTRICTED_ROLES.includes(r));
}

export async function listPermissions(req, res) {
  const roles = await configurableRoles();
  const docs = await RolePermission.find({ role: { $in: roles } });
  const byRole = new Map(docs.map((d) => [d.role, d.enabledModules]));

  const permissions = roles.map((role) => ({
    role,
    enabledModules: byRole.get(role) ?? [...MODULE_KEYS],
  }));

  res.json({ modules: MODULES, permissions });
}

export async function updatePermissions(req, res) {
  const { role } = req.params;
  const { enabledModules } = req.body;

  if (UNRESTRICTED_ROLES.includes(role)) {
    return res.status(400).json({ error: "This role always has full access" });
  }
  if (!Array.isArray(enabledModules) || enabledModules.some((m) => !MODULE_KEYS.includes(m))) {
    return res.status(400).json({ error: "enabledModules must be a list of valid module keys" });
  }

  const roles = await configurableRoles();
  if (!roles.includes(role)) {
    return res.status(404).json({ error: "Unknown role" });
  }

  const doc = await RolePermission.findOneAndUpdate(
    { role },
    { enabledModules },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  res.json({ role: doc.role, enabledModules: doc.enabledModules });
}

export async function getMyPermissions(req, res) {
  const enabledModules = await getEnabledModules(req.user.role);
  res.json({ enabledModules });
}
