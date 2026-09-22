import DailyWorkUpdate from "../models/DailyWorkUpdate.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { startOfDay } from "../lib/dates.js";
import { notify } from "../lib/notify.js";
import { NO_DASHBOARD_ROLES } from "../lib/roles.js";
import { isManagementRole, customRoleNamesByBaseType } from "../lib/roleCategory.js";

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
  // Management roles review everyone else's work updates instead of
  // submitting their own — their attendance is marked on login instead (see
  // authController.me).
  if (await isManagementRole(req.user.role)) {
    return res.status(403).json({ error: "This role doesn't submit daily work updates" });
  }

  const { slot, todaysTask, blocker, endGoal, progress } = req.body;

  if (!["start", "end"].includes(slot)) {
    return res.status(400).json({ error: "slot must be 'start' or 'end'" });
  }
  if (!todaysTask || !blocker) {
    return res.status(400).json({ error: "todaysTask and blocker are required" });
  }
  if (slot === "start" && !endGoal) {
    return res.status(400).json({ error: "endGoal is required for the start-of-day update" });
  }
  if (slot === "end" && !progress) {
    return res.status(400).json({ error: "progress is required for the end-of-day update" });
  }

  const existingAttendance = await Attendance.findOne({ user: req.user.sub, date: startOfDay() });
  if (existingAttendance && ["Absent", "Leave"].includes(existingAttendance.status)) {
    return res.status(400).json({ error: `You're marked ${existingAttendance.status} today, so an update can't be submitted` });
  }

  if (slot === "end") {
    const startUpdate = await DailyWorkUpdate.findOne({ user: req.user.sub, date: startOfDay(), slot: "start" });
    if (!startUpdate) {
      return res.status(400).json({ error: "Submit the start-of-day update first" });
    }
  }

  // Only the content fields are $set — the follow-up thread is left untouched,
  // so editing the update never drops an existing follow-up request or reply.
  const update = await DailyWorkUpdate.findOneAndUpdate(
    { user: req.user.sub, date: startOfDay(), slot },
    {
      $set: {
        todaysTask,
        blocker,
        ...(slot === "start" ? { endGoal } : { progress }),
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

  res.json({ update: toUpdateDTO(update, false) });
}

export async function getTodayUpdate(req, res) {
  const updates = await DailyWorkUpdate.find({ user: req.user.sub, date: startOfDay() }).populate(
    "followUps.by",
    "name"
  );
  const start = updates.find((u) => u.slot === "start") ?? null;
  const end = updates.find((u) => u.slot === "end") ?? null;
  res.json({
    update: {
      start: start ? toUpdateDTO(start, false) : null,
      end: end ? toUpdateDTO(end, false) : null,
    },
  });
}

export async function listTodayStatus(req, res) {
  const today = startOfDay();
  // Management roles never submit their own update, so they'd always show
  // as "not submitted" — exclude them (built-in and any custom management
  // role) rather than have the roster/counter be wrong.
  const customManagement = await customRoleNamesByBaseType("management");
  const excludedRoles = [...NO_DASHBOARD_ROLES, ...customManagement];
  const users = await User.find({ isActive: true, role: { $nin: excludedRoles } }).sort({ employeeId: 1 });
  const updates = await DailyWorkUpdate.find({ date: today }).populate("followUps.by", "name");
  const updatesByUserId = new Map();
  for (const u of updates) {
    const key = u.user.toString();
    if (!updatesByUserId.has(key)) updatesByUserId.set(key, {});
    updatesByUserId.get(key)[u.slot] = u;
  }

  const statuses = users.map((user) => {
    const { start, end } = updatesByUserId.get(user._id.toString()) ?? {};
    return {
      user: { id: user._id, employeeId: user.employeeId, name: user.name, role: user.role },
      submitted: Boolean(start) || Boolean(end),
      startSubmitted: Boolean(start),
      endSubmitted: Boolean(end),
      updateIds: { start: start?._id ?? null, end: end?._id ?? null },
      todaysTaskSnippet: end?.todaysTask ?? start?.todaysTask ?? null,
    };
  });

  res.json({ statuses, date: today });
}

// Full work-update content for a management role (or an employee's own
// history), filtered by employee and/or calendar month, newest first.
export async function listUpdates(req, res) {
  const filter = {};

  if (await isManagementRole(req.user.role)) {
    if (req.query.userId) filter.user = req.query.userId;
  } else {
    filter.user = req.user.sub;
  }

  // Always scope to a single month — default to the current one — so this never
  // returns an employee's entire multi-year history in one response.
  const now = startOfDay();
  const month = Number(req.query.month) || now.getUTCMonth() + 1;
  const year = Number(req.query.year) || now.getUTCFullYear();
  filter.date = { $gte: new Date(Date.UTC(year, month - 1, 1)), $lt: new Date(Date.UTC(year, month, 1)) };

  const updates = await DailyWorkUpdate.find(filter)
    .populate("user", "name employeeId role")
    .populate("followUps.by", "name")
    .sort({ date: -1, slot: 1 });

  res.json({ updates: updates.map((u) => toUpdateDTO(u, true)) });
}

function toUpdateDTO(u, withUser) {
  return {
    id: u._id,
    ...(withUser && {
      user: u.user ? { id: u.user._id, name: u.user.name, employeeId: u.user.employeeId } : null,
    }),
    date: u.date,
    slot: u.slot,
    todaysTask: u.todaysTask,
    blocker: u.blocker,
    ...(u.slot === "start" ? { endGoal: u.endGoal } : { progress: u.progress }),
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

// A management role asks an employee to expand on or clarify a work update.
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
