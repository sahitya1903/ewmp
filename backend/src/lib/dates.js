// Date helpers shared across controllers. Every date-only value in the app
// (attendance, leave, holidays, notices) is keyed to UTC midnight.

export function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
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
