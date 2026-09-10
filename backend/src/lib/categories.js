// A role's *category* is a display grouping (a name like "employee" or a
// custom "Team Leads"); its *base type* is one of these two values and is
// what actually drives behavior — the landing page and which access panel
// applies. Every custom category picks a base type and then behaves exactly
// like it. "management" and "employee" are the two permanent built-in
// categories; they *are* the base types.
export const BASE_TYPES = ["management", "employee"];

export const BUILTIN_CATEGORIES = [
  { name: "management", baseType: "management" },
  { name: "employee", baseType: "employee" },
];

export const BUILTIN_CATEGORY_NAMES = BUILTIN_CATEGORIES.map((c) => c.name);
