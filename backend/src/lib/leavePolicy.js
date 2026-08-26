import Attendance from "../models/Attendance.js";

export const MONTHLY_PAID_LEAVE_QUOTA = 2;

function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export async function getPaidLeaveUsed(userId, year, month) {
  const { start, end } = monthRange(year, month);
  return Attendance.countDocuments({
    user: userId,
    status: "Leave",
    paidLeave: true,
    date: { $gte: start, $lt: end },
  });
}

export async function getLeaveBalance(userId, year, month) {
  const used = await getPaidLeaveUsed(userId, year, month);
  const remaining = Math.max(MONTHLY_PAID_LEAVE_QUOTA - used, 0);
  return { quota: MONTHLY_PAID_LEAVE_QUOTA, used, remaining };
}

// dates must already be filtered to working days and sorted ascending.
export async function assignPaidStatusForDates(userId, dates) {
  const monthCounts = new Map();
  const results = [];

  for (const date of dates) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const key = `${year}-${month}`;

    if (!monthCounts.has(key)) {
      monthCounts.set(key, await getPaidLeaveUsed(userId, year, month));
    }

    const used = monthCounts.get(key);
    const paid = used < MONTHLY_PAID_LEAVE_QUOTA;
    if (paid) monthCounts.set(key, used + 1);
    results.push({ date, paid });
  }

  return results;
}
