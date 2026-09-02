// Month-cursor helpers for calendars and pickers that page month by month.
// A "cursor" is a plain { year, month } with month 1–12.

export function thisMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function addMonths({ year, month }, delta) {
  const zeroBased = month - 1 + delta;
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}
