import Attendance from "../models/Attendance.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Salary from "../models/Salary.js";
import SalaryPayment from "../models/SalaryPayment.js";
import { getWorkingDaysInMonth, getWorkingDaysInRange, getDaysInMonth } from "./workingDays.js";

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

  const workingDays = await getWorkingDaysInMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const preJoiningDays = getPreJoiningDays(profile.joiningDate, year, month, daysInMonth);

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const records = await Attendance.find({ user: userId, date: { $gte: start, $lt: end } });

  const joiningClamp = profile.joiningDate < start ? start : profile.joiningDate > end ? end : profile.joiningDate;
  const workingDaysBeforeJoining = await getWorkingDaysInRange(start, joiningClamp);

  const absentDays = records.filter((r) => r.status === "Absent").length;
  const leaveRecords = records.filter((r) => r.status === "Leave");
  const leaveDays = leaveRecords.length;
  const paidLeaveDays = leaveRecords.filter((r) => r.paidLeave).length;
  const unpaidLeaveDays = leaveDays - paidLeaveDays;
  const presentDays = Math.max(workingDays - workingDaysBeforeJoining - absentDays - leaveDays, 0);

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
