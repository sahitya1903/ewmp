import DailyWorkUpdate from "../models/DailyWorkUpdate.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { startOfDay } from "../lib/dates.js";
import { notify } from "../lib/notify.js";

function fmtDay(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Submissions always target "today" (server clock, not client input), which is
// what enforces the 12:00 AM–11:59 PM window — an employee can submit or
// revise their update any time today, but never for a past or future date.
export async function submitUpdate(req, res) {
  const { currentProject, todaysProgress, remainingWork, estimatedCompletion, additionalWork } = req.body;

  if (!currentProject || !todaysProgress || !remainingWork) {
    return res.status(400).json({ error: "currentProject, todaysProgress, and remainingWork are required" });
  }

  const existingAttendance = await Attendance.findOne({ user: req.user.sub, date: startOfDay() });
  if (existingAttendance && ["Absent", "Leave"].includes(existingAttendance.status)) {
    return res.status(400).json({ error: `You're marked ${existingAttendance.status} today, so an update can't be submitted` });
  }

  const update = await DailyWorkUpdate.findOneAndUpdate(
    { user: req.user.sub, date: startOfDay() },
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
    { user: req.user.sub, date: startOfDay() },
    { $setOnInsert: { status: "Present", markedBy: req.user.sub } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ update });
}

export async function getTodayUpdate(req, res) {
  const update = await DailyWorkUpdate.findOne({ user: req.user.sub, date: startOfDay() }).populate(
    "followUp.by",
    "name"
  );
  res.json({ update });
}

export async function listTodayStatus(req, res) {
  const today = startOfDay();
  const users = await User.find({ isActive: true }).sort({ employeeId: 1 });
  const updates = await DailyWorkUpdate.find({ date: today }).populate("followUp.by", "name");
  const updatesByUserId = new Map(updates.map((u) => [u.user.toString(), u]));

  const statuses = users.map((user) => {
    const update = updatesByUserId.get(user._id.toString());
    return {
      user: { id: user._id, employeeId: user.employeeId, name: user.name, role: user.role },
      submitted: Boolean(update),
      updateId: update?._id ?? null,
      currentProject: update?.currentProject ?? null,
      followUp: update?.followUp?.note
        ? { note: update.followUp.note, by: update.followUp.by?.name ?? null, at: update.followUp.at }
        : null,
    };
  });

  res.json({ statuses, date: today });
}

// Admin / Management asks an employee to expand on or clarify a work update.
export async function requestFollowUp(req, res) {
  const { id } = req.params;
  const { note } = req.body;

  if (!note || !note.trim()) {
    return res.status(400).json({ error: "note is required" });
  }

  const update = await DailyWorkUpdate.findById(id);
  if (!update) return res.status(404).json({ error: "Work update not found" });

  update.followUp = { note: note.trim(), by: req.user.sub, at: new Date() };
  await update.save();

  const reviewer = await User.findById(req.user.sub, "name");
  await notify(
    update.user,
    "follow_up",
    `${reviewer?.name ?? "A reviewer"} asked for a follow-up on your ${fmtDay(update.date)} work update: ${note.trim()}`
  );

  res.json({ ok: true });
}
