import DailyWorkUpdate from "../models/DailyWorkUpdate.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";

function todayDateOnly() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

// Submissions always target "today" (server clock, not client input), which is
// what enforces the 12:00 AM–11:59 PM window — an employee can submit or
// revise their update any time today, but never for a past or future date.
export async function submitUpdate(req, res) {
  const { currentProject, todaysProgress, remainingWork, estimatedCompletion, additionalWork } = req.body;

  if (!currentProject || !todaysProgress || !remainingWork) {
    return res.status(400).json({ error: "currentProject, todaysProgress, and remainingWork are required" });
  }

  const existingAttendance = await Attendance.findOne({ user: req.user.sub, date: todayDateOnly() });
  if (existingAttendance && ["Absent", "Leave"].includes(existingAttendance.status)) {
    return res.status(400).json({ error: `You're marked ${existingAttendance.status} today, so an update can't be submitted` });
  }

  const update = await DailyWorkUpdate.findOneAndUpdate(
    { user: req.user.sub, date: todayDateOnly() },
    {
      $set: {
        currentProject,
        todaysProgress,
        remainingWork,
        estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : null,
        additionalWork: additionalWork || "",
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  // Submitting a work update is proof of attendance — mark the day Present,
  // but never override an existing Absent/Leave record (e.g. an admin-marked
  // absence someone submits an update for anyway shouldn't flip to Present).
  await Attendance.findOneAndUpdate(
    { user: req.user.sub, date: todayDateOnly() },
    { $setOnInsert: { status: "Present", markedBy: req.user.sub } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ update });
}

export async function getTodayUpdate(req, res) {
  const update = await DailyWorkUpdate.findOne({ user: req.user.sub, date: todayDateOnly() });
  res.json({ update });
}

export async function listTodayStatus(req, res) {
  const today = todayDateOnly();
  const users = await User.find({ isActive: true }).sort({ employeeId: 1 });
  const updates = await DailyWorkUpdate.find({ date: today });
  const updatesByUserId = new Map(updates.map((u) => [u.user.toString(), u]));

  const statuses = users.map((user) => {
    const update = updatesByUserId.get(user._id.toString());
    return {
      user: { id: user._id, employeeId: user.employeeId, name: user.name, role: user.role },
      submitted: Boolean(update),
      currentProject: update?.currentProject ?? null,
    };
  });

  res.json({ statuses, date: today });
}
