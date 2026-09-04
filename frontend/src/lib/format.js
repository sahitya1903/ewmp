export function currency(n) {
  return `₹${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// The site-wide date format — dd/mm/yyyy, regardless of the browser's locale
// (the locale-default format is ambiguous: mm/dd in some locales, dd/mm in
// others). Every displayed date on the site should go through this.
export function formatDateDMY(value) {
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function timeAgo(value) {
  const secs = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateDMY(value);
}
