import Attendance from "../models/Attendance.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Salary from "../models/Salary.js";
import SalaryPayment from "../models/SalaryPayment.js";
import { getDaysInMonth, getHolidaySet, isWorkingDay } from "./workingDays.js";

// Days in the given month that fall before the employee's joiningDate (0 if they
// joined before this month, and the full month if they haven't joined yet).
function getPreJoiningDays(joiningDate, year, month, daysInMonth) {
  const joinYear = joiningDate.getUTCFullYear();
  const joinMonth = joiningDate.getUTCMonth() + 1;

  if (joinYear < year || (joinYear === year && joinMonth < month)) return 0;
  if (joinYear > year || (joinYear === year && joinMonth > month)) return daysInMonth;
  return joiningDate.getUTCDate() - 1;
}

// Working days are computed once per calendar month, so no absent/leave
// marking is needed for days off — only exceptions need to be recorded.
export async function computeSalaryForUser(userId, month, year) {
  const profile = await EmployeeProfile.findOne({ user: userId });
  if (!profile) return null;

  const daysInMonth = getDaysInMonth(year, month);
  const preJoiningDays = getPreJoiningDays(profile.joiningDate, year, month, daysInMonth);

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const records = await Attendance.find({ user: userId, date: { $gte: start, $lt: end } });

  const joiningClamp = profile.joiningDate < start ? start : profile.joiningDate > end ? end : profile.joiningDate;

  const explicitAbsentDays = records.filter((r) => r.status === "Absent").length;
  const leaveRecords = records.filter((r) => r.status === "Leave");
  const leaveDays = leaveRecords.length;
  const paidLeaveDays = leaveRecords.filter((r) => r.paidLeave).length;
  const unpaidLeaveDays = leaveDays - paidLeaveDays;
  const presentDays = records.filter((r) => r.status === "Present").length;

  // A working day that's already over (before today) with no record at all — no
  // Present, Absent, or Leave — means the employee neither got approved leave nor
  // logged a work update that day, so it's automatically counted as absent.
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const pastRangeEnd = now < end ? now : end;

  const implicitAbsentDates = [];
  if (joiningClamp < pastRangeEnd) {
    const holidaySet = await getHolidaySet(start, end);
    const recordedDateKeys = new Set(records.map((r) => r.date.toISOString().slice(0, 10)));
    const cursor = new Date(joiningClamp);
    while (cursor < pastRangeEnd) {
      if (isWorkingDay(cursor, holidaySet) && !recordedDateKeys.has(cursor.toISOString().slice(0, 10))) {
        implicitAbsentDates.push(new Date(cursor));
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  // Persist these as real Attendance records (not just a number in this month's
  // total) so the calendar and attendance list reflect them too, not only salary.
  if (implicitAbsentDates.length > 0) {
    try {
      await Attendance.insertMany(
        implicitAbsentDates.map((date) => ({ user: userId, date, status: "Absent" })),
        { ordered: false }
      );
    } catch {
      // A duplicate-key race (another request just recorded the same day) is fine.
    }
  }

  const absentDays = explicitAbsentDays + implicitAbsentDates.length;

  // Working days = however many days have actually been accounted for since
  // joining — present, on leave (paid or not), or absent. This is always exactly
  // the sum of those four columns, whether the month is still in progress (days
  // not yet reached aren't counted either way) or long over.
  const workingDays = presentDays + paidLeaveDays + unpaidLeaveDays + absentDays;

  const dailySalary = daysInMonth > 0 ? profile.monthlySalary / daysInMonth : 0;
  // Weekly offs and holidays are paid, same as a present day; an absence, leave
  // beyond the monthly paid-leave quota, or any day before the employee joined
  // is deducted.
  const unpaidDays = absentDays + unpaidLeaveDays + preJoiningDays;
  const salaryPayable = dailySalary * Math.max(daysInMonth - unpaidDays, 0);

  const salary = await Salary.findOneAndUpdate(
    { user: userId, month, year },
    {
      $set: {
        workingDays,
        presentDays,
        leaveDays,
        paidLeaveDays,
        unpaidLeaveDays,
        absentDays,
        monthlySalary: profile.monthlySalary,
        dailySalary: Math.round(dailySalary * 100) / 100,
        salaryPayable: Math.round(salaryPayable * 100) / 100,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  await SalaryPayment.findOneAndUpdate(
    { salary: salary._id },
    { $setOnInsert: { user: userId, credited: false } },
    { upsert: true }
  );

  return salary;
}
