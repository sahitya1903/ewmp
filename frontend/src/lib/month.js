// Month-cursor helpers for calendars and pickers that page month by month.
// A "cursor" is a plain { year, month } with month 1–12.

// The day boundary is IST (UTC+5:30), matching the backend's startOfDay() —
// so "today"/"this month" default to the same calendar day here as they do
// server-side, regardless of the viewer's own browser timezone.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// "Right now", shifted so its UTC calendar fields read out the IST date —
// pair with toDateKey (in MonthCalendar.js) to get today's key.
export function today() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

export function thisMonth() {
  const now = today();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function addMonths({ year, month }, delta) {
  const zeroBased = month - 1 + delta;
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}
