import Holiday from "../models/Holiday.js";

export function isWeekend(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

export async function getHolidaySet(start, end) {
  const holidays = await Holiday.find({ date: { $gte: start, $lt: end } });
  return new Set(holidays.map((h) => dateKey(h.date)));
}

export function isWorkingDay(date, holidaySet) {
  return !isWeekend(date) && !holidaySet.has(dateKey(date));
}

export function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Counts working days in [start, end) — end is exclusive.
export async function getWorkingDaysInRange(start, end) {
  if (end <= start) return 0;
  const holidaySet = await getHolidaySet(start, end);

  let workingDays = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    if (isWorkingDay(cursor, holidaySet)) workingDays++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return workingDays;
}

export async function getWorkingDaysInMonth(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return getWorkingDaysInRange(start, end);
}
