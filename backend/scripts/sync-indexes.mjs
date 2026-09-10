// One-off: build every index declared in the Mongoose schemas on a target
// database. Use after copy-to-railway.mjs when the index builds were skipped
// (e.g. Railway reported "available disk space ... is less than required
// minimum of 524288000" — MongoDB refuses index builds with under 500 MB free).
//
//   TARGET_URI="mongodb://mongo:PASS@HOST.proxy.rlwy.net:PORT/ewmp?authSource=admin" \
//   node scripts/sync-indexes.mjs
//
// Falls back to MONGODB_URI if TARGET_URI is unset.
//
// Pass --lower-threshold to also try lowering indexBuildMinAvailableDiskSpaceMB
// to 50 for this mongod (needs an admin user; not persistent across restarts).
// Prefer actually growing the Railway volume instead.

import mongoose from "mongoose";

import User from "../src/models/User.js";
import EmployeeProfile from "../src/models/EmployeeProfile.js";
import Holiday from "../src/models/Holiday.js";
import LeaveRequest from "../src/models/LeaveRequest.js";
import Attendance from "../src/models/Attendance.js";
import DailyWorkUpdate from "../src/models/DailyWorkUpdate.js";
import Salary from "../src/models/Salary.js";
import SalaryPayment from "../src/models/SalaryPayment.js";
import Notification from "../src/models/Notification.js";
import Notice from "../src/models/Notice.js";
import CustomRole from "../src/models/CustomRole.js";
import Category from "../src/models/Category.js";
import ManagementCapability from "../src/models/ManagementCapability.js";
import RolePermission from "../src/models/RolePermission.js";

const URI = process.env.TARGET_URI || process.env.MONGODB_URI;
const LOWER_THRESHOLD = process.argv.includes("--lower-threshold");

if (!URI) {
  console.error("Set TARGET_URI (or MONGODB_URI) to the destination connection string.");
  process.exit(1);
}

const MODELS = [
  User,
  EmployeeProfile,
  Holiday,
  LeaveRequest,
  Attendance,
  DailyWorkUpdate,
  Salary,
  SalaryPayment,
  Notification,
  Notice,
  CustomRole,
  Category,
  ManagementCapability,
  RolePermission,
];

await mongoose.connect(URI);
const conn = mongoose.connection;
console.log(`\n  target: ${conn.host}/${conn.name}\n`);

if (LOWER_THRESHOLD) {
  try {
    const before = await conn.db.admin().command({ getParameter: 1, indexBuildMinAvailableDiskSpaceMB: 1 });
    await conn.db.admin().command({ setParameter: 1, indexBuildMinAvailableDiskSpaceMB: 50 });
    console.log(`  indexBuildMinAvailableDiskSpaceMB: ${before.indexBuildMinAvailableDiskSpaceMB} -> 50\n`);
  } catch (e) {
    console.warn(`  ! could not lower threshold (need an admin user): ${e.message}\n`);
  }
}

let ok = 0;
let failed = 0;
for (const Model of MODELS) {
  const coll = Model.collection.collectionName;
  try {
    // syncIndexes() creates missing indexes and drops ones no longer in the
    // schema, leaving the collection matching the model exactly.
    const dropped = await Model.syncIndexes();
    const names = (await Model.collection.indexes()).map((i) => i.name).filter((n) => n !== "_id_");
    console.log(`  ${coll.padEnd(24)} ok  [${names.join(", ") || "none"}]${dropped.length ? `  (dropped: ${dropped.join(", ")})` : ""}`);
    ok += 1;
  } catch (e) {
    console.error(`  ${coll.padEnd(24)} FAIL  ${e.message}`);
    failed += 1;
  }
}

console.log(`\n  ${ok} model(s) synced, ${failed} failed.\n`);
await mongoose.disconnect();
process.exit(failed ? 1 : 0);
