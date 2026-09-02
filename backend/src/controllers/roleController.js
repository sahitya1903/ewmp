import { ROLE_NAMES } from "../lib/roles.js";
import CustomRole from "../models/CustomRole.js";

export async function listRoles(req, res) {
  const custom = await CustomRole.find().sort({ name: 1 });
  res.json({ roles: [...ROLE_NAMES, ...custom.map((r) => r.name)] });
}

export async function createRole(req, res) {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  const trimmed = name.trim();

  const custom = await CustomRole.find().select("name");
  const existing = new Set([...ROLE_NAMES, ...custom.map((r) => r.name)].map((n) => n.toLowerCase()));
  if (existing.has(trimmed.toLowerCase())) {
    return res.status(409).json({ error: "That role already exists" });
  }

  const role = await CustomRole.create({ name: trimmed, createdBy: req.user.sub });
  res.status(201).json({ role: role.name });
}
