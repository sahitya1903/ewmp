import CustomRole from "../models/CustomRole.js";
import Category from "../models/Category.js";
import { NO_DASHBOARD_ROLES } from "./roles.js";
import { BUILTIN_CATEGORIES } from "./categories.js";

// The category *name* a role belongs to. Built-in management roles
// (Admin/HR/Accounts_E) are always "management"; anything else is looked up
// on CustomRole, defaulting to "employee" if somehow not found (defensive —
// every custom role is created with one). May be a custom category name.
export async function getRoleCategory(role) {
  if (NO_DASHBOARD_ROLES.includes(role)) return "management";
  const custom = await CustomRole.findOne({ name: role }).select("category");
  return custom?.category ?? "employee";
}

// The base type ("management" | "employee") of a category name — the value
// that actually drives behavior. Built-ins resolve from the constant table;
// a custom category from its own record; unknown falls back to "employee".
export async function getCategoryBaseType(name) {
  const builtin = BUILTIN_CATEGORIES.find((c) => c.name === name);
  if (builtin) return builtin.baseType;
  const custom = await Category.findOne({ name }).select("baseType");
  return custom?.baseType ?? "employee";
}

// The base type of a role, via its category.
export async function getRoleBaseType(role) {
  if (NO_DASHBOARD_ROLES.includes(role)) return "management";
  return getCategoryBaseType(await getRoleCategory(role));
}

export async function isManagementRole(role) {
  return (await getRoleBaseType(role)) === "management";
}

// Built-ins first, then custom categories, each tagged with isBuiltIn.
export async function listCategories() {
  const custom = await Category.find().sort({ name: 1 }).select("name baseType");
  return [
    ...BUILTIN_CATEGORIES.map((c) => ({ ...c, isBuiltIn: true })),
    ...custom.map((c) => ({ name: c.name, baseType: c.baseType, isBuiltIn: false })),
  ];
}

// Names of every custom role whose category has the given base type. Used to
// build the "which roles are configurable here" / "which roles to exclude"
// lists that used to be a flat `category === "management"` query.
export async function customRoleNamesByBaseType(baseType) {
  const categoryNames = (await listCategories())
    .filter((c) => c.baseType === baseType)
    .map((c) => c.name);
  const roles = await CustomRole.find({ category: { $in: categoryNames } }).select("name");
  return roles.map((r) => r.name);
}
