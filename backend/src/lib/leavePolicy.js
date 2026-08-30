import Attendance from "../models/Attendance.js";
import EmployeeProfile from "../models/EmployeeProfile.js";

// Paid leave accrues at 1.75 days per completed calendar month (= 21/year),
// credited only once a month has fully elapsed, capped at the annual total.
export const ANNUAL_PAID_LEAVE_QUOTA = 21;
export const MONTHLY_ACCRUAL_RATE = 1.75;

function yearRange(year) {
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year + 1, 0, 1)) };
}

// Whole days accrued as of `asOfDate`, for the calendar year `asOfDate` falls
// in. Only months the employee was on payroll for in full (joined on or
// before that month's first day) count, and only once that month has ended.
function accruedWholeDaysAsOf(joiningDate, asOfDate) {
  const year = asOfDate.getUTCFullYear();
  if (joiningDate.getUTCFullYear() > year) return 0;

  let completedMonths = 0;
  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(Date.UTC(year, m, 1));
    const nextMonthStart = new Date(Date.UTC(year, m + 1, 1));
    if (nextMonthStart > asOfDate) break;
    if (joiningDate <= monthStart) completedMonths++;
  }

  return Math.min(Math.floor(completedMonths * MONTHLY_ACCRUAL_RATE), ANNUAL_PAID_LEAVE_QUOTA);
}

// The instant used to judge how much has accrued for a given calendar year:
// right now, if that's the current year; the end of the year, if it's
// already over; the very start of the year (nothing accrued yet), if it
// hasn't started.
function accrualAsOfDateForYear(year) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  if (year === currentYear) return now;
  if (year < currentYear) return new Date(Date.UTC(year + 1, 0, 1));
  return new Date(Date.UTC(year, 0, 1));
}

export async function getPaidLeaveUsedInYear(userId, year) {
  const { start, end } = yearRange(year);
  return Attendance.countDocuments({
    user: userId,
    status: "Leave",
    paidLeave: true,
    date: { $gte: start, $lt: end },
  });
}

export async function getLeaveBalance(userId, year) {
  const profile = await EmployeeProfile.findOne({ user: userId });
  if (!profile) return { quota: ANNUAL_PAID_LEAVE_QUOTA, accrued: 0, used: 0, remaining: 0 };

  const asOfDate = accrualAsOfDateForYear(year);
  const accrued = accruedWholeDaysAsOf(profile.joiningDate, asOfDate);
  const used = await getPaidLeaveUsedInYear(userId, year);
  const remaining = Math.max(accrued - used, 0);

  return { quota: ANNUAL_PAID_LEAVE_QUOTA, accrued, used, remaining };
}

// dates must already be filtered to working days and sorted ascending.
export async function assignPaidStatusForDates(userId, dates) {
  const yearState = new Map(); // year -> { accrued, used }
  const results = [];

  for (const date of dates) {
    const year = date.getUTCFullYear();

    if (!yearState.has(year)) {
      const balance = await getLeaveBalance(userId, year);
      yearState.set(year, { accrued: balance.accrued, used: balance.used });
    }

    const state = yearState.get(year);
    const paid = state.used < state.accrued;
    if (paid) state.used += 1;
    results.push({ date, paid });
  }

  return results;
}
