// One-off: copy a source MongoDB into a target (e.g. local dev -> Atlas),
// documents and _ids preserved. The target is wiped first.
//
//   TARGET_URI="mongodb+srv://USER:PASS@CLUSTER.mongodb.net/ewmp?retryWrites=true&w=majority" \
//   npm run copy-db --prefix backend
//
// SOURCE_URI defaults to the local dev database.
//
// Only collections backed by a model in src/models are copied (leftovers from
// removed features are skipped), and the target's indexes are built from the
// model schemas rather than copied, so stale source indexes don't carry over.

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

const SOURCE_URI = process.env.SOURCE_URI || "mongodb://127.0.0.1:27017/ewmp";
const TARGET_URI = process.env.TARGET_URI;

if (!TARGET_URI) {
  console.error("Set TARGET_URI to the destination connection string.");
  process.exit(1);
}
if (SOURCE_URI === TARGET_URI) {
  console.error("SOURCE_URI and TARGET_URI are identical — refusing.");
  process.exit(1);
}

const src = await mongoose.createConnection(SOURCE_URI).asPromise();
const dst = await mongoose.createConnection(TARGET_URI).asPromise();

console.log(`\n  source: ${src.host}/${src.name}`);
console.log(`  target: ${dst.host}/${dst.name}\n`);

// Wipe the target.
for (const { name } of await dst.db.listCollections().toArray()) {
  await dst.db.dropCollection(name).catch(() => {});
}

const modelled = new Set(MODELS.map((M) => M.collection.collectionName));
const sourceNames = (await src.db.listCollections().toArray())
  .map((c) => c.name)
  .filter((n) => !n.startsWith("system."))
  .sort();

let grandTotal = 0;
for (const name of sourceNames) {
  if (!modelled.has(name)) {
    console.log(`  ${name.padEnd(24)} skipped (no model)`);
    continue;
  }
  const docs = await src.collection(name).find({}).toArray();
  if (docs.length) await dst.collection(name).insertMany(docs, { ordered: false });
  grandTotal += docs.length;
  console.log(`  ${name.padEnd(24)} ${docs.length}`);
}

// createCollection + syncIndexes so every model's collection and indexes
// exist on the target, even ones that were empty or absent in the source.
for (const Model of MODELS) {
  const TargetModel = dst.model(Model.modelName, Model.schema);
  await TargetModel.createCollection().catch(() => {});
  await TargetModel.syncIndexes();
}

console.log(`\n  ${grandTotal} documents copied; indexes built for ${MODELS.length} models.\n`);
await src.close();
await dst.close();
