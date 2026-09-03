import Attendance from "../models/Attendance.js";
import DailyWorkUpdate from "../models/DailyWorkUpdate.js";
import { REVIEWER_ROLES } from "../lib/roles.js";
import { startOfDay, isValidDate } from "../lib/dates.js";
import { getHolidaySet, isWorkingDay } from "../lib/workingDays.js";

export async function markAttendance(req, res) {
  const { userId, date, status } = req.body;

  if (!userId || !date || !status) {
    return res.status(400).json({ error: "userId, date, and status are required" });
  }
  if (!["Present", "Absent"].includes(status)) {
    return res.status(400).json({ error: "status must be Present or Absent" });
  }

  if (!isValidDate(date)) {
    return res.status(400).json({ error: "date must be a valid date" });
  }

  const day = startOfDay(date);
  if (day > startOfDay()) {
    return res.status(400).json({ error: "Attendance can't be marked for a future date" });
  }

  const holidaySet = await getHolidaySet(day, new Date(day.getTime() + 86400000));
  if (!isWorkingDay(day, holidaySet)) {
    return res.status(400).json({ error: "That date is a weekly off or holiday — attendance isn't tracked for it" });
  }

  const attendance = await Attendance.findOneAndUpdate(
    { user: userId, date: day },
    { $set: { status, markedBy: req.user.sub }, $unset: { leaveRequest: "" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  // Marking someone Absent contradicts any work update they already submitted
  // for that day — clear it so the day doesn't show both "absent" and "worked".
  if (status === "Absent") {
    await DailyWorkUpdate.deleteOne({ user: userId, date: day });
  }

  res.json({ attendance });
}

export async function listAttendance(req, res) {
  const { month, year, userId } = req.query;

  const filter = {};

  if (!REVIEWER_ROLES.includes(req.user.role)) {
    filter.user = req.user.sub;
  } else if (userId) {
    filter.user = userId;
  }

  if (month && year) {
    const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    const end = new Date(Date.UTC(Number(year), Number(month), 1));
    filter.date = { $gte: start, $lt: end };
  }

  const attendance = await Attendance.find(filter)
    .populate("user", "employeeId name")
    .sort({ date: 1 });

  res.json({ attendance });
}
