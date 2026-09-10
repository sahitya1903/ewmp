import Category from "../models/Category.js";
import CustomRole from "../models/CustomRole.js";
import { BASE_TYPES, BUILTIN_CATEGORY_NAMES } from "../lib/categories.js";
import { listCategories } from "../lib/roleCategory.js";

export async function listCategoriesHandler(req, res) {
  res.json({ categories: await listCategories() });
}

export async function createCategory(req, res) {
  const { name, baseType } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!BASE_TYPES.includes(baseType)) {
    return res.status(400).json({ error: 'baseType must be "management" or "employee"' });
  }
  const trimmed = name.trim();

  const taken = new Set((await listCategories()).map((c) => c.name.toLowerCase()));
  if (taken.has(trimmed.toLowerCase())) {
    return res.status(409).json({ error: "That category already exists" });
  }

  const category = await Category.create({ name: trimmed, baseType, createdBy: req.user.sub });
  res.status(201).json({ category: { name: category.name, baseType: category.baseType, isBuiltIn: false } });
}

export async function deleteCategory(req, res) {
  const { name } = req.params;

  if (BUILTIN_CATEGORY_NAMES.includes(name)) {
    return res.status(400).json({ error: "Built-in categories can't be deleted" });
  }

  const category = await Category.findOne({ name });
  if (!category) {
    return res.status(404).json({ error: "Unknown category" });
  }

  const roles = await CustomRole.find({ category: name }).select("name");
  if (roles.length) {
    const list = roles.map((r) => r.name).join(", ");
    return res.status(409).json({ error: `Roles still use this category (${list}) — move or delete them first` });
  }

  await Category.deleteOne({ name });
  res.json({ ok: true });
}
