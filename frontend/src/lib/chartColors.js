// Validated categorical palette (fixed order — never cycled or reassigned per-render).
export const CATEGORICAL = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
];

// Fixed status colors — reserved for state, never reused as a categorical slot.
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const ROLE_COLORS = {
  Developer_E: CATEGORICAL[0],
  "Cyber Security_E": CATEGORICAL[1],
  "Social Media & Performance Marketing_E": CATEGORICAL[2],
  Accounts_E: CATEGORICAL[3],
  Admin: CATEGORICAL[4],
  Management: CATEGORICAL[5],
  Intern: CATEGORICAL[6],
};

// Fallback for custom roles added at runtime, which have no fixed color slot.
export function getRoleColor(role) {
  return ROLE_COLORS[role] ?? CATEGORICAL[7];
}
