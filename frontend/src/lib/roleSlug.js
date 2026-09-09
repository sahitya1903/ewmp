// Mirrors backend/src/lib/roleSlug.js — used to check whether the logged-in
// user's role matches the [roleSlug] the browser is currently on.
export function slugifyRole(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
