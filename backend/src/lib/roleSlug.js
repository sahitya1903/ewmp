// Admin, HR, and Accounts each have their own dedicated page; a new custom
// management-category role has no bespoke route, so it lands on a generic
// console at a URL slugged from its name instead (see
// frontend/src/app/[roleSlug]/page.js).
export function slugifyRole(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// A custom management role's slug must never collide with one of these —
// Next.js always resolves the static page first, making the role's console
// unreachable at that URL.
export const RESERVED_SLUGS = [
  "admin",
  "hr",
  "accounts",
  "dashboard",
  "login",
  "change-password",
  "forgot-password",
  "reset-password",
];
