import { ROLE_NAMES, NO_DASHBOARD_ROLES } from "../lib/roles.js";
import CustomRole from "../models/CustomRole.js";
import RolePermission from "../models/RolePermission.js";
import ManagementCapability from "../models/ManagementCapability.js";
import User from "../models/User.js";
import { slugifyRole, RESERVED_SLUGS } from "../lib/roleSlug.js";
import { listCategories, getCategoryBaseType } from "../lib/roleCategory.js";

function categoryOf(name) {
  return NO_DASHBOARD_ROLES.includes(name) ? "management" : "employee";
}

export async function listRoles(req, res) {
  const custom = await CustomRole.find().sort({ name: 1 });
  const roles = [
    ...ROLE_NAMES.map((name) => ({ name, category: categoryOf(name), isBuiltIn: true })),
    ...custom.map((r) => ({ name: r.name, category: r.category, isBuiltIn: false })),
  ];
  res.json({ roles });
}

export async function createRole(req, res) {
  const { name, category } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  const trimmed = name.trim();

  const categoryNames = (await listCategories()).map((c) => c.name);
  if (!categoryNames.includes(category)) {
    return res.status(400).json({ error: "Unknown category" });
  }

  const custom = await CustomRole.find().select("name");
  const existing = new Set([...ROLE_NAMES, ...custom.map((r) => r.name)].map((n) => n.toLowerCase()));
  if (existing.has(trimmed.toLowerCase())) {
    return res.status(409).json({ error: "That role already exists" });
  }

  const baseType = await getCategoryBaseType(category);
  if (baseType === "management" && RESERVED_SLUGS.includes(slugifyRole(trimmed))) {
    return res.status(409).json({ error: "That name's console URL collides with an existing page — pick another name" });
  }

  const role = await CustomRole.create({ name: trimmed, category, createdBy: req.user.sub });
  res.status(201).json({ role: role.name, category: role.category });
}

export async function deleteRole(req, res) {
  const { name } = req.params;

  if (ROLE_NAMES.includes(name)) {
    return res.status(400).json({ error: "Built-in roles can't be deleted" });
  }

  const role = await CustomRole.findOne({ name });
  if (!role) {
    return res.status(404).json({ error: "Unknown role" });
  }

  const assigned = await User.countDocuments({ role: name });
  if (assigned > 0) {
    const who = assigned === 1 ? "1 employee still has" : `${assigned} employees still have`;
    return res.status(409).json({ error: `${who} this role — reassign them first` });
  }

  await CustomRole.deleteOne({ name });
  // Drop the now-orphaned Access Control / capability config for this role.
  await RolePermission.deleteOne({ role: name });
  await ManagementCapability.deleteOne({ role: name });

  res.json({ ok: true });
}
