import Holiday from "../models/Holiday.js";

// The company's only weekly off is Monday — everything else (including
// Saturday/Sunday) is a working day unless it's a declared Holiday.
export function isWeeklyOff(date) {
  const day = date.getUTCDay();
  return day === 1;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

export async function getHolidaySet(start, end) {
  const holidays = await Holiday.find({ date: { $gte: start, $lt: end } });
  return new Set(holidays.map((h) => dateKey(h.date)));
}

export function isWorkingDay(date, holidaySet) {
  return !isWeeklyOff(date) && !holidaySet.has(dateKey(date));
}

export function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
