export function currency(n) {
  return `₹${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
