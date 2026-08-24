import Attendance from "../models/Attendance.js";

export async function markAttendance(req, res) {
  const { userId, date, status } = req.body;

  if (!userId || !date || !status) {
    return res.status(400).json({ error: "userId, date, and status are required" });
  }
  if (!["Present", "Absent"].includes(status)) {
    return res.status(400).json({ error: "status must be Present or Absent" });
  }

  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);

  const attendance = await Attendance.findOneAndUpdate(
    { user: userId, date: day },
    { $set: { status, markedBy: req.user.sub }, $unset: { leaveRequest: "" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ attendance });
}

export async function listAttendance(req, res) {
  const { month, year, userId } = req.query;

  const filter = {};

  if (!["Admin", "Management"].includes(req.user.role)) {
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
