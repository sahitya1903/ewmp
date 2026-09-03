import DailyWorkUpdate from "../models/DailyWorkUpdate.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { startOfDay } from "../lib/dates.js";
import { notify } from "../lib/notify.js";
import { REVIEWER_ROLES } from "../lib/roles.js";

function fmtDay(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function serializeFollowUps(followUps = []) {
  return followUps.map((f) => ({
    kind: f.kind,
    text: f.text,
    by: f.by?.name ?? null,
    byId: (f.by?._id ?? f.by)?.toString() ?? null,
    at: f.at,
  }));
}

// True when the thread is open and the last entry is a reviewer request the
// employee hasn't answered yet.
function awaitingResponse(update) {
  const followUps = update.followUps ?? [];
  return (
    !update.followUpClosedAt &&
    followUps.length > 0 &&
    followUps[followUps.length - 1].kind === "request"
  );
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

  // Only the content fields are $set — the follow-up thread is left untouched,
  // so editing the update never drops an existing follow-up request or reply.
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
    "followUps.by",
    "name"
  );
  res.json({
    update: update
      ? { ...update.toObject(), followUps: serializeFollowUps(update.followUps) }
      : null,
  });
}

export async function listTodayStatus(req, res) {
  const today = startOfDay();
  const users = await User.find({ isActive: true }).sort({ employeeId: 1 });
  const updates = await DailyWorkUpdate.find({ date: today }).populate("followUps.by", "name");
  const updatesByUserId = new Map(updates.map((u) => [u.user.toString(), u]));

  const statuses = users.map((user) => {
    const update = updatesByUserId.get(user._id.toString());
    return {
      user: { id: user._id, employeeId: user.employeeId, name: user.name, role: user.role },
      submitted: Boolean(update),
      updateId: update?._id ?? null,
      currentProject: update?.currentProject ?? null,
      followUps: update ? serializeFollowUps(update.followUps) : [],
    };
  });

  res.json({ statuses, date: today });
}

// Full work-update content for HR/Admin (or an employee's own history),
// filtered by employee and/or calendar month, newest first.
export async function listUpdates(req, res) {
  const filter = {};

  if (REVIEWER_ROLES.includes(req.user.role)) {
    if (req.query.userId) filter.user = req.query.userId;
  } else {
    filter.user = req.user.sub;
  }

  // Always scope to a single month — default to the current one — so this never
  // returns an employee's entire multi-year history in one response.
  const now = new Date();
  const month = Number(req.query.month) || now.getUTCMonth() + 1;
  const year = Number(req.query.year) || now.getUTCFullYear();
  filter.date = { $gte: new Date(Date.UTC(year, month - 1, 1)), $lt: new Date(Date.UTC(year, month, 1)) };

  const updates = await DailyWorkUpdate.find(filter)
    .populate("user", "name employeeId role")
    .populate("followUps.by", "name")
    .sort({ date: -1, createdAt: -1 });

  res.json({ updates: updates.map((u) => toUpdateDTO(u, true)) });
}

function toUpdateDTO(u, withUser) {
  return {
    id: u._id,
    ...(withUser && {
      user: u.user ? { id: u.user._id, name: u.user.name, employeeId: u.user.employeeId } : null,
    }),
    date: u.date,
    currentProject: u.currentProject,
    todaysProgress: u.todaysProgress,
    remainingWork: u.remainingWork,
    estimatedCompletion: u.estimatedCompletion ?? null,
    additionalWork: u.additionalWork || "",
    submittedAt: u.createdAt,
    // Employees can revise the same day's update until midnight — surface
    // whether (and when) this one was edited after it was first submitted.
    editedAt: u.updatedAt - u.createdAt > 1000 ? u.updatedAt : null,
    followUps: serializeFollowUps(u.followUps),
    awaitingResponse: awaitingResponse(u),
    followUpClosed: Boolean(u.followUpClosedAt),
    followUpClosedAt: u.followUpClosedAt ?? null,
  };
}

// The current employee's updates that carry a follow-up thread — so they can
// see and reply to requests on any of their updates, not just today's. Only
// open threads by default; pass ?includeClosed=1 for the full history.
export async function listMyFollowUps(req, res) {
  const filter = { user: req.user.sub, "followUps.0": { $exists: true } };
  if (req.query.includeClosed !== "1") {
    filter.followUpClosedAt = null;
  }
  const updates = await DailyWorkUpdate.find(filter).populate("followUps.by", "name").sort({ date: -1 });
  res.json({ updates: updates.map((u) => toUpdateDTO(u, false)) });
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

  update.followUps.push({ kind: "request", text: note.trim(), by: req.user.sub, at: new Date() });
  // A fresh request reopens a closed thread.
  update.followUpClosedAt = null;
  update.followUpClosedBy = null;
  await update.save();

  const reviewer = await User.findById(req.user.sub, "name");
  await notify(
    update.user,
    "follow_up",
    `${reviewer?.name ?? "A reviewer"} asked for a follow-up on your ${fmtDay(update.date)} work update: ${note.trim()}`
  );

  res.json({ ok: true });
}

// The employee replies to a follow-up on their own update. The original update,
// the request, and every earlier reply are all kept.
export async function respondToFollowUp(req, res) {
  const { id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const update = await DailyWorkUpdate.findById(id);
  if (!update) return res.status(404).json({ error: "Work update not found" });
  if (update.user.toString() !== req.user.sub) {
    return res.status(403).json({ error: "You can only respond to a follow-up on your own update" });
  }
  if (!update.followUps.some((f) => f.kind === "request")) {
    return res.status(400).json({ error: "There's no follow-up request to respond to" });
  }
  if (update.followUpClosedAt) {
    return res.status(400).json({ error: "This follow-up has been closed" });
  }

  update.followUps.push({ kind: "response", text: text.trim(), by: req.user.sub, at: new Date() });
  await update.save();

  // Notify whoever asked for a follow-up on this update.
  const requesterIds = [
    ...new Set(update.followUps.filter((f) => f.kind === "request" && f.by).map((f) => f.by.toString())),
  ];
  const employee = await User.findById(req.user.sub, "name");
  await Promise.all(
    requesterIds.map((uid) =>
      notify(
        uid,
        "follow_up",
        `${employee?.name ?? "An employee"} responded to your follow-up on their ${fmtDay(update.date)} work update: ${text.trim()}`
      )
    )
  );

  res.json({ ok: true });
}

// A reviewer ends the follow-up conversation on an update.
export async function closeFollowUp(req, res) {
  const { id } = req.params;

  const update = await DailyWorkUpdate.findById(id);
  if (!update) return res.status(404).json({ error: "Work update not found" });
  if (update.followUps.length === 0) {
    return res.status(400).json({ error: "There's no follow-up to close" });
  }
  if (update.followUpClosedAt) return res.json({ ok: true });

  update.followUpClosedAt = new Date();
  update.followUpClosedBy = req.user.sub;
  await update.save();

  const reviewer = await User.findById(req.user.sub, "name");
  await notify(
    update.user,
    "follow_up",
    `${reviewer?.name ?? "A reviewer"} closed the follow-up on your ${fmtDay(update.date)} work update.`
  );

  res.json({ ok: true });
}
