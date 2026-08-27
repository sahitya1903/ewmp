export const ROLE_NAMES = [
  "Developer_E",
  "Cyber Security_E",
  "Social Media & Performance Marketing_E",
  "Accounts_E",
  "Admin",
  "Management",
  "Intern",
];

// Roles selectable when adding/editing a regular employee (Intern is added via its own tab).
export const EMPLOYEE_ROLE_NAMES = ROLE_NAMES.filter((role) => role !== "Intern");

export const ROLE_LABELS = {
  Developer_E: "Developer",
  "Cyber Security_E": "Cyber Security",
  "Social Media & Performance Marketing_E": "Social Media & Performance Marketing",
  Accounts_E: "Accounts",
  Admin: "Admin",
  Management: "Management",
  Intern: "Intern",
};
