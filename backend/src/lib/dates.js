// Date helpers shared across controllers. Every date-only value in the app
// (attendance, leave, holidays, notices) is keyed to UTC midnight — that's
// just the storage/comparison convention, though: it's a UTC instant whose
// calendar date *labels* the day it represents, chosen below by IST's
// calendar (the day boundary — midnight to midnight — is IST, UTC+5:30, not
// UTC), so "today" matches the calendar day the app's users are actually in.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Already-UTC-midnight values (every stored date-only value, and any
// "YYYY-MM-DD" input parsed by `new Date(...)`) pass through unchanged: +5:30
// only ever pushes a midnight instant to 05:30 the same UTC day, which still
// floors back to itself. Only a real "right now" instant (with a live
// time-of-day) can actually land in the next IST calendar day.
export function startOfDay(value = new Date()) {
  const shifted = new Date(new Date(value).getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

export function isValidDate(value) {
  return !Number.isNaN(new Date(value).getTime());
}

// Every calendar date from `from` to `to` inclusive, each at UTC midnight.
export function eachDate(from, to) {
  const dates = [];
  const cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
