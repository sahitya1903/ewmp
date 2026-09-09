import { ROLE_NAMES, NO_DASHBOARD_ROLES } from "../lib/roles.js";
import CustomRole from "../models/CustomRole.js";
import { slugifyRole, RESERVED_SLUGS } from "../lib/roleSlug.js";

function categoryOf(name) {
  return NO_DASHBOARD_ROLES.includes(name) ? "management" : "employee";
}

export async function listRoles(req, res) {
  const custom = await CustomRole.find().sort({ name: 1 });
  const roles = [
    ...ROLE_NAMES.map((name) => ({ name, category: categoryOf(name) })),
    ...custom.map((r) => ({ name: r.name, category: r.category })),
  ];
  res.json({ roles });
}

export async function createRole(req, res) {
  const { name, category } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!["management", "employee"].includes(category)) {
    return res.status(400).json({ error: 'category must be "management" or "employee"' });
  }
  const trimmed = name.trim();

  const custom = await CustomRole.find().select("name");
  const existing = new Set([...ROLE_NAMES, ...custom.map((r) => r.name)].map((n) => n.toLowerCase()));
  if (existing.has(trimmed.toLowerCase())) {
    return res.status(409).json({ error: "That role already exists" });
  }

  if (category === "management" && RESERVED_SLUGS.includes(slugifyRole(trimmed))) {
    return res.status(409).json({ error: "That name's console URL collides with an existing page — pick another name" });
  }

  const role = await CustomRole.create({ name: trimmed, category, createdBy: req.user.sub });
  res.status(201).json({ role: role.name, category: role.category });
}
