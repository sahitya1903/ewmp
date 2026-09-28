// Tops up daily work updates for every active employee, from their joining
// date to today, without wiping anything (unlike seed.mjs):
//
//   1. Syncs the DailyWorkUpdate indexes (drops the old one-per-day unique
//      index, which would block a start + end pair on the same day).
//   2. Converts legacy single-form updates (currentProject / todaysProgress,
//      no slot) into a start + end pair, keeping any follow-up thread on the
//      end-of-day entry.
//   3. For each working day with no Leave/Absent record, adds whichever of the
//      start/end entries is missing and marks the day Present — same as a
//      real submission does.
//
// Management roles (Admin, HR, Accounts and custom management roles) are
// skipped; they don't submit work updates.
//
//   npm run backfill-updates --prefix backend
//
// Targets MONGODB_URI (backend/.env, or set it on the command line).
// Safe to re-run: it only ever adds what's missing.

import mongoose from "mongoose";
import { connectDB } from "../src/lib/db.js";
import { startOfDay, eachDate } from "../src/lib/dates.js";
import { getHolidaySet, isWorkingDay } from "../src/lib/workingDays.js";
import { NO_DASHBOARD_ROLES } from "../src/lib/roles.js";
import { customRoleNamesByBaseType } from "../src/lib/roleCategory.js";
import User from "../src/models/User.js";
import EmployeeProfile from "../src/models/EmployeeProfile.js";
import Attendance from "../src/models/Attendance.js";
import DailyWorkUpdate from "../src/models/DailyWorkUpdate.js";

const TASK_POOL = [
  "Employee Work Management Portal — dashboard work",
  "Customer Support Ticketing Revamp",
  "Mobile App Performance Audit",
  "Q3 Marketing Analytics Dashboard",
  "Payroll Automation Pipeline",
  "Internal Security Compliance Review",
  "Onboarding Experience Redesign",
  "Vendor Invoice Reconciliation Tool",
];
const BLOCKER_NOTES = [
  "None",
  "Waiting on review feedback from a teammate",
  "Blocked on API access from another team",
  "Needs design sign-off before continuing",
  "None",
];
const PROGRESS_NOTES = [
  "Made steady progress on the assigned task.",
  "Completed a major chunk of planned work.",
  "Fixed a couple of blocking issues and moved forward.",
  "Wrapped up review comments from yesterday.",
  "Paired with a teammate to unblock a dependency.",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dateKey = (date) => date.toISOString().slice(0, 10);

// Dates are UTC midnight labelling an IST calendar day (see lib/dates.js), so
// 10:00 IST is +4.5h and 18:30 IST is +13h. Never stamp a time in the future.
const IST_START = 4.5;
const IST_END = 13;
function stampAt(date, hours) {
  const stamp = new Date(date.getTime() + hours * 3600 * 1000);
  const now = new Date();
  return stamp > now ? now : stamp;
}

await connectDB();
const conn = mongoose.connection;
console.log(`\n  target: ${conn.host}/${conn.name}\n`);

const dropped = await DailyWorkUpdate.syncIndexes();
if (dropped.length) console.log(`  dropped stale indexes: ${dropped.join(", ")}`);

// --- 1. Legacy updates -> start + end pairs ----------------------------------

const legacy = await DailyWorkUpdate.collection.find({ slot: { $exists: false } }).toArray();
for (const doc of legacy) {
  const task = doc.currentProject || "General work";
  const progress = [
    doc.todaysProgress,
    doc.remainingWork && `Remaining: ${doc.remainingWork}`,
    doc.additionalWork && `Also: ${doc.additionalWork}`,
  ]
    .filter(Boolean)
    .join(" ") || "Made steady progress on the assigned task.";

  await DailyWorkUpdate.collection.updateOne(
    { _id: doc._id },
    {
      $set: { slot: "end", todaysTask: task, blocker: "None", progress },
      $unset: { currentProject: "", todaysProgress: "", remainingWork: "", estimatedCompletion: "", additionalWork: "" },
    }
  );
  await DailyWorkUpdate.collection.updateOne(
    { user: doc.user, date: doc.date, slot: "start" },
    {
      $setOnInsert: {
        todaysTask: task,
        blocker: "None",
        endGoal: `Move ${task} forward`,
        followUps: [],
        createdAt: stampAt(doc.date, IST_START),
        updatedAt: stampAt(doc.date, IST_START),
        __v: 0,
      },
    },
    { upsert: true }
  );
}
console.log(`  legacy updates converted: ${legacy.length}`);

// --- 2. Fill every missing working day up to today ---------------------------

const today = startOfDay();
const excludedRoles = [...NO_DASHBOARD_ROLES, ...(await customRoleNamesByBaseType("management"))];
const employees = await User.find({ isActive: true, role: { $nin: excludedRoles } }).sort({ employeeId: 1 });
const profiles = new Map(
  (await EmployeeProfile.find({ user: { $in: employees.map((u) => u._id) } })).map((p) => [p.user.toString(), p])
);

let addedUpdates = 0;
let addedPresent = 0;

for (const user of employees) {
  const joining = profiles.get(user._id.toString())?.joiningDate;
  if (!joining) {
    console.log(`  ${user.email.padEnd(24)} skipped (no joining date)`);
    continue;
  }
  const from = startOfDay(joining);
  const holidaySet = await getHolidaySet(from, new Date(today.getTime() + 86400000));

  const attendance = new Map(
    (await Attendance.find({ user: user._id, date: { $gte: from, $lte: today } })).map((a) => [dateKey(a.date), a])
  );
  const existing = await DailyWorkUpdate.find({ user: user._id, date: { $gte: from, $lte: today } }).sort({ date: 1 });
  const have = new Set(existing.map((u) => `${dateKey(u.date)}:${u.slot}`));

  // Carry on with whatever the employee was last working on.
  const task = existing.at(-1)?.todaysTask ?? pick(TASK_POOL);

  const updates = [];
  const present = [];
  for (const date of eachDate(from, today)) {
    if (!isWorkingDay(date, holidaySet)) continue;
    const key = dateKey(date);
    const att = attendance.get(key);
    if (att && ["Leave", "Absent"].includes(att.status)) continue;

    if (!have.has(`${key}:start`)) {
      updates.push({
        user: user._id,
        date,
        slot: "start",
        todaysTask: task,
        blocker: pick(BLOCKER_NOTES),
        endGoal: `Move ${task} forward`,
        createdAt: stampAt(date, IST_START),
        updatedAt: stampAt(date, IST_START),
      });
    }
    if (!have.has(`${key}:end`)) {
      updates.push({
        user: user._id,
        date,
        slot: "end",
        todaysTask: task,
        blocker: pick(BLOCKER_NOTES),
        progress: pick(PROGRESS_NOTES),
        createdAt: stampAt(date, IST_END),
        updatedAt: stampAt(date, IST_END),
      });
    }
    if (!att) {
      present.push({
        user: user._id,
        date,
        status: "Present",
        markedBy: user._id,
        createdAt: stampAt(date, IST_START),
        updatedAt: stampAt(date, IST_START),
      });
    }
  }

  // timestamps: false so the submission-time stamps above survive.
  if (updates.length) await DailyWorkUpdate.insertMany(updates, { timestamps: false });
  if (present.length) await Attendance.insertMany(present, { timestamps: false });
  addedUpdates += updates.length;
  addedPresent += present.length;
  console.log(`  ${user.email.padEnd(24)} +${updates.length} updates, +${present.length} Present days`);
}

console.log(`\n  ${addedUpdates} updates and ${addedPresent} attendance records added, through ${dateKey(today)}.\n`);
await mongoose.disconnect();
