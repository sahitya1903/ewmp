// The built-in roles. Admin/Management can add more at runtime (see the
// CustomRole model); a user's role is any of these plus any custom name.
export const ROLE_NAMES = [
  "Developer_E",
  "Cyber Security_E",
  "Social Media & Performance Marketing_E",
  "Accounts_E",
  "Admin",
  "Management",
  "Intern",
];

// Roles that can see/manage data across all employees, not just their own.
export const REVIEWER_ROLES = ["Admin", "Management"];
