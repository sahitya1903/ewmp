import { connectDB } from "../src/lib/db.js";
import { hashPassword } from "../src/lib/auth.js";
import mongoose from "mongoose";
import { getHolidaySet, isWorkingDay } from "../src/lib/workingDays.js";
import { assignPaidStatusForDates } from "../src/lib/leavePolicy.js";
import { computeSalaryForUser } from "../src/lib/salaryCalc.js";
import User from "../src/models/User.js";
import EmployeeProfile from "../src/models/EmployeeProfile.js";
import Holiday from "../src/models/Holiday.js";
import LeaveRequest from "../src/models/LeaveRequest.js";
import Attendance from "../src/models/Attendance.js";
import DailyWorkUpdate from "../src/models/DailyWorkUpdate.js";
import Salary from "../src/models/Salary.js";
import SalaryPayment from "../src/models/SalaryPayment.js";
import Meeting from "../src/models/Meeting.js";
import Notification from "../src/models/Notification.js";
import Notice from "../src/models/Notice.js";

const PASSWORD = "Test@1234";

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function eachDate(from, to) {
  const dates = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

// Joining dates are all at least a year back (as of this seed's fictional "today"
// of late Aug 2026), spread out for a realistic tenure mix — long enough that
// everyone has had time to accrue a real paid-leave balance under the 1.75/month
// policy, not just the handful of days a brand-new joiner would have.
const SAMPLE_USERS = [
  { employeeId: "EMP001", name: "Aarav Shah", email: "dev1@ewmp.test", role: "Developer_E", phone: "9000000001", monthlySalary: 55000, joiningDate: "2025-01-15" },
  { employeeId: "EMP002", name: "Priya Nair", email: "dev2@ewmp.test", role: "Developer_E", phone: "9000000002", monthlySalary: 60000, joiningDate: "2024-11-01" },
  { employeeId: "EMP003", name: "Rohan Mehta", email: "cybersec1@ewmp.test", role: "Cyber Security_E", phone: "9000000003", monthlySalary: 65000, joiningDate: "2025-03-10" },
  { employeeId: "EMP004", name: "Sneha Kulkarni", email: "smpm1@ewmp.test", role: "Social Media & Performance Marketing_E", phone: "9000000004", monthlySalary: 48000, joiningDate: "2024-06-01" },
  { employeeId: "EMP005", name: "Vikram Rao", email: "accounts1@ewmp.test", role: "Accounts_E", phone: "9000000005", monthlySalary: 52000, joiningDate: "2023-08-20" },
  { employeeId: "EMP006", name: "Neha Joshi", email: "admin1@ewmp.test", role: "Admin", phone: "9000000006", monthlySalary: 58000, joiningDate: "2023-05-05" },
  { employeeId: "EMP007", name: "Karan Malhotra", email: "hr1@ewmp.test", role: "Management", phone: "9000000007", monthlySalary: 90000, joiningDate: "2022-09-12" },
  { employeeId: "INT001", name: "Ananya Verma", email: "intern1@ewmp.test", role: "Intern", phone: "9000000008", monthlySalary: 15000, joiningDate: "2025-07-01" },
  { employeeId: "INT002", name: "Rahul Singh", email: "intern2@ewmp.test", role: "Intern", phone: "9000000009", monthlySalary: 12000, joiningDate: "2025-08-15" },
];

async function seed() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    EmployeeProfile.deleteMany({}),
    Holiday.deleteMany({}),
    LeaveRequest.deleteMany({}),
    Attendance.deleteMany({}),
    DailyWorkUpdate.deleteMany({}),
    Salary.deleteMany({}),
    SalaryPayment.deleteMany({}),
    Meeting.deleteMany({}),
    Notification.deleteMany({}),
    Notice.deleteMany({}),
  ]);

  const users = [];
  for (const u of SAMPLE_USERS) {
    const passwordHash = await hashPassword(PASSWORD);
    const user = await User.create({
      employeeId: u.employeeId,
      name: u.name,
      email: u.email,
      passwordHash,
      role: u.role,
    });
    await EmployeeProfile.create({
      user: user._id,
      phone: u.phone,
      monthlySalary: u.monthlySalary,
      joiningDate: new Date(u.joiningDate),
    });
    users.push(user);
  }

  const [dev1, dev2, cybersec1, smpm1, accounts1, admin1, hr1] = users;

  await Holiday.insertMany([
    { date: new Date("2026-08-15"), name: "Independence Day" },
    { date: new Date("2026-10-02"), name: "Gandhi Jayanti" },
    { date: new Date("2026-11-08"), name: "Diwali" },
    { date: new Date("2027-01-01"), name: "New Year's Day" },
  ]);

  // "Today" is the real current date, not a fixed one, so freshly seeded data
  // always includes today — ready for Admin to verify on the Today's Work
  // Updates screen, and so date-relative scenarios (like the pending leave
  // below) never drift into the past as time goes on.
  const seedToday = new Date();
  seedToday.setUTCHours(0, 0, 0, 0);
  const inDays = (n) => {
    const d = new Date(seedToday);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  };

  const holidaySet = await getHolidaySet(new Date(Date.UTC(2022, 0, 1)), new Date(Date.UTC(2027, 1, 1)));
  const workingDatesBetween = (from, to) => eachDate(from, to).filter((d) => isWorkingDay(d, holidaySet));

  // Each crafted leave/absence scenario below reserves its dates so the general
  // Present-day generator further down won't touch them. Not everyone gets one —
  // some employees demonstrate paid leave comfortably covered by their accrued
  // balance, one deliberately takes more than she's accrued (partly unpaid), one
  // gets admin-marked absences (always unpaid), and the rest are a clean,
  // full-attendance baseline.
  const attendanceRows = [];

  // dev1: a short leave, easily covered by over a year of accrual -> fully paid.
  const leave1 = await LeaveRequest.create({
    user: dev1._id,
    fromDate: new Date("2026-08-25"),
    toDate: new Date("2026-08-26"),
    reason: "Family function",
    status: "Approved",
    reviewedBy: hr1._id,
    reviewedAt: new Date("2026-08-21"),
  });
  for (const { date, paid } of await assignPaidStatusForDates(dev1._id, workingDatesBetween(leave1.fromDate, leave1.toDate))) {
    attendanceRows.push({ user: dev1._id, date, status: "Leave", paidLeave: paid, leaveRequest: leave1._id });
  }

  // dev2: a genuinely future request, awaiting review (demonstrates the
  // pending-approval workflow) — always a few days ahead of "today".
  await LeaveRequest.create({
    user: dev2._id,
    fromDate: inDays(5),
    toDate: inDays(5),
    reason: "Medical appointment",
    status: "Pending",
  });

  // dev2: a 3-week leave that deliberately outruns her accrued balance -> the
  // days within her balance are paid, the rest are unpaid and deduct salary.
  const leave2 = await LeaveRequest.create({
    user: dev2._id,
    fromDate: new Date("2026-08-04"),
    toDate: new Date("2026-08-24"),
    reason: "Extended family trip",
    status: "Approved",
    reviewedBy: hr1._id,
    reviewedAt: new Date("2026-08-02"),
  });
  for (const { date, paid } of await assignPaidStatusForDates(dev2._id, workingDatesBetween(leave2.fromDate, leave2.toDate))) {
    attendanceRows.push({ user: dev2._id, date, status: "Leave", paidLeave: paid, leaveRequest: leave2._id });
  }

  await LeaveRequest.create({
    user: cybersec1._id,
    fromDate: new Date("2026-08-18"),
    toDate: new Date("2026-08-19"),
    reason: "Personal work",
    status: "Rejected",
    reviewedBy: hr1._id,
    reviewedAt: new Date("2026-08-17"),
  });

  // cybersec1: admin-marked absences (not via a leave request) -> always unpaid/deducted.
  attendanceRows.push({ user: cybersec1._id, date: new Date("2026-08-11"), status: "Absent", markedBy: admin1._id });
  attendanceRows.push({ user: cybersec1._id, date: new Date("2026-08-12"), status: "Absent", markedBy: admin1._id });
  attendanceRows.push({ user: cybersec1._id, date: new Date("2026-08-13"), status: "Absent", markedBy: admin1._id });

  // smpm1: a short leave, comfortably within her accrued balance -> fully paid.
  const leave3 = await LeaveRequest.create({
    user: smpm1._id,
    fromDate: new Date("2026-08-17"),
    toDate: new Date("2026-08-19"),
    reason: "Wedding function",
    status: "Approved",
    reviewedBy: hr1._id,
    reviewedAt: new Date("2026-08-14"),
  });
  for (const { date, paid } of await assignPaidStatusForDates(smpm1._id, workingDatesBetween(leave3.fromDate, leave3.toDate))) {
    attendanceRows.push({ user: smpm1._id, date, status: "Leave", paidLeave: paid, leaveRequest: leave3._id });
  }

  // intern1: interns accrue paid leave the same way -> a short, fully paid leave too.
  const intern1 = users[7];
  const leave4 = await LeaveRequest.create({
    user: intern1._id,
    fromDate: new Date("2026-08-20"),
    toDate: new Date("2026-08-21"),
    reason: "Festival travel",
    status: "Approved",
    reviewedBy: hr1._id,
    reviewedAt: new Date("2026-08-18"),
  });
  for (const { date, paid } of await assignPaidStatusForDates(intern1._id, workingDatesBetween(leave4.fromDate, leave4.toDate))) {
    attendanceRows.push({ user: intern1._id, date, status: "Leave", paidLeave: paid, leaveRequest: leave4._id });
  }

  await Attendance.insertMany(attendanceRows);

  // A submitted work update is what marks a day Present in the live app, so every
  // employee gets a full Present + work-update history from their joining date up
  // to today. A couple of specific days keep hand-written content for narrative
  // flavor; the rest get a randomly assigned (but consistent per employee)
  // project and varied but plausible progress notes.
  const reservedKeys = new Set(attendanceRows.map((r) => `${r.user.toString()}:${dateKey(r.date)}`));

  const HAND_WRITTEN_UPDATES = [
    {
      user: dev1._id,
      date: new Date("2026-08-21"),
      currentProject: "Employee Work Management Portal",
      todaysProgress: "Built auth API and login page",
      remainingWork: "Role-based dashboards",
      estimatedCompletion: new Date("2026-08-30"),
      additionalWork: "",
    },
    {
      user: dev2._id,
      date: new Date("2026-08-27"),
      currentProject: "Internal Billing Tool",
      todaysProgress: "Fixed invoice PDF export bug",
      remainingWork: "Write regression tests",
      estimatedCompletion: new Date("2026-09-03"),
      additionalWork: "Helped onboard new intern",
    },
  ];
  const handWrittenKeys = new Set(HAND_WRITTEN_UPDATES.map((u) => `${u.user.toString()}:${dateKey(u.date)}`));

  const PROJECT_POOL = [
    "Employee Work Management Portal",
    "Customer Support Ticketing Revamp",
    "Mobile App Performance Audit",
    "Q3 Marketing Analytics Dashboard",
    "Payroll Automation Pipeline",
    "Internal Security Compliance Review",
    "Onboarding Experience Redesign",
    "Vendor Invoice Reconciliation Tool",
  ];
  const PROGRESS_NOTES = [
    "Made steady progress on the assigned task.",
    "Completed a major chunk of planned work.",
    "Fixed a couple of blocking issues and moved forward.",
    "Wrapped up review comments from yesterday.",
    "Paired with a teammate to unblock a dependency.",
  ];
  const REMAINING_NOTES = [
    "A few edge cases left to handle.",
    "Needs a round of testing before it is done.",
    "Waiting on review feedback.",
    "Documentation still pending.",
    "Should be wrapped up by end of week.",
  ];

  // Each employee sticks to one randomly-picked project across their whole history.
  const projectByUserId = new Map(users.map((u) => [u._id.toString(), pick(PROJECT_POOL)]));

  const generatedAttendance = [];
  const generatedUpdates = [];

  for (let i = 0; i < SAMPLE_USERS.length; i++) {
    const user = users[i];
    const cursor = new Date(`${SAMPLE_USERS[i].joiningDate}T00:00:00.000Z`);

    while (cursor <= seedToday) {
      if (isWorkingDay(cursor, holidaySet)) {
        const key = `${user._id.toString()}:${dateKey(cursor)}`;
        if (!reservedKeys.has(key)) {
          generatedAttendance.push({ user: user._id, date: new Date(cursor), status: "Present" });
          if (!handWrittenKeys.has(key)) {
            generatedUpdates.push({
              user: user._id,
              date: new Date(cursor),
              currentProject: projectByUserId.get(user._id.toString()),
              todaysProgress: pick(PROGRESS_NOTES),
              remainingWork: pick(REMAINING_NOTES),
              estimatedCompletion: null,
              additionalWork: "",
            });
          }
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  await Attendance.insertMany(generatedAttendance);
  await DailyWorkUpdate.insertMany([...HAND_WRITTEN_UPDATES, ...generatedUpdates]);

  // ---- Salary history -----------------------------------------------------
  // Compute every employee's salary for each month from the one they joined in
  // up to and including the current month (all recomputed live on first view —
  // these are just persisted starting values). Every *past* month is then marked
  // credited by Admin / Management / Accounts in rotation; the current month is
  // still in progress, so it stays pending.
  //
  // Where a month carried an attendance-based deduction, or where Accounts
  // recovered money for damaged or lost office property, the payment gets a
  // remark spelling out why — and for the property cases the amount actually
  // credited is set below the computed payable.
  const crediterIds = [admin1._id, hr1._id, accounts1._id];

  // Curated months where the amount paid was deliberately *less* than the
  // computed payable. Keyed by "<employeeId>:<year>-<month>".
  const propertyRecoveries = {
    "EMP001:2026-6": { amount: 2000, remark: "Rs 2,000 recovered for a cracked company laptop screen (accidental damage)." },
    "EMP003:2026-7": { amount: 2500, remark: "Rs 2,500 recovered for damage to a monitor in the security lab." },
    "EMP004:2026-5": { amount: 1500, remark: "Rs 1,500 deducted towards lost office property — misplaced access card and laptop charger." },
    "EMP005:2026-4": { amount: 3000, remark: "Rs 3,000 adjusted against a petty-cash shortfall found during reconciliation." },
    "EMP002:2026-3": { amount: 1200, remark: "Rs 1,200 recovered for a broken office chair (mishandling)." },
  };

  const curMonth = seedToday.getUTCMonth() + 1;
  const curYear = seedToday.getUTCFullYear();
  let crediterIdx = 0;

  for (let i = 0; i < SAMPLE_USERS.length; i++) {
    const user = users[i];
    const joining = new Date(`${SAMPLE_USERS[i].joiningDate}T00:00:00.000Z`);
    let y = joining.getUTCFullYear();
    let m = joining.getUTCMonth() + 1;

    while (y < curYear || (y === curYear && m <= curMonth)) {
      const salary = await computeSalaryForUser(user._id, m, y);
      const isPast = y < curYear || (y === curYear && m < curMonth);

      if (salary && isPast) {
        const recovery = propertyRecoveries[`${SAMPLE_USERS[i].employeeId}:${y}-${m}`];
        let amountCredited = salary.salaryPayable;
        let remark = "";

        if (recovery) {
          amountCredited = Math.round((salary.salaryPayable - recovery.amount) * 100) / 100;
          remark = recovery.remark;
        } else if (salary.absentDays > 0) {
          remark = `${salary.absentDays} day(s)' pay deducted for unapproved absence.`;
        } else if (salary.unpaidLeaveDays > 0) {
          remark = `${salary.unpaidLeaveDays} leave day(s) beyond the accrued paid-leave balance treated as unpaid.`;
        }

        // Salaries go out on the 3rd of the following month.
        const creditedDate = new Date(Date.UTC(y, m, 3));
        const creditedBy = crediterIds[crediterIdx % crediterIds.length];

        await SalaryPayment.findOneAndUpdate(
          { salary: salary._id },
          {
            $set: {
              credited: true,
              creditedDate,
              creditedBy,
              amountCredited,
              remark: remark || null,
            },
            $setOnInsert: { user: user._id },
            $push: {
              history: {
                action: "credited",
                amount: amountCredited,
                remark: remark || null,
                by: creditedBy,
                at: creditedDate,
              },
            },
          },
          { upsert: true }
        );
        crediterIdx += 1;
      }

      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }

  await Meeting.create({
    title: "Sprint planning",
    description: "Plan next two-week sprint for the portal",
    dateTime: new Date("2026-08-24T10:30:00"),
    participants: [dev1._id, dev2._id, cybersec1._id, hr1._id],
    createdBy: hr1._id,
  });

  // Admin-posted notices / meeting links — visible to every employee and shown
  // on the calendar. One just past, two upcoming (relative to the real "today").
  await Notice.insertMany([
    {
      title: "Monthly all-hands",
      body: "Company-wide update on Q3 progress and the roadmap ahead. Attendance expected for everyone.",
      link: "https://meet.google.com/abc-defg-hij",
      date: inDays(3),
      createdBy: admin1._id,
    },
    {
      title: "Office closed for maintenance",
      body: "The office will be closed for electrical maintenance — work from home that day.",
      date: inDays(10),
      createdBy: admin1._id,
    },
    {
      title: "New attendance policy briefing",
      body: "Walkthrough of the updated attendance and work-update policy that took effect this month.",
      link: "https://meet.google.com/xyz-uvwx-yz",
      date: inDays(-4),
      createdBy: admin1._id,
    },
  ]);

  await Notification.insertMany([
    { user: dev1._id, type: "leave_status", message: "Your leave request (25–26 Aug) was approved." },
    {
      user: dev2._id,
      type: "leave_status",
      message: "Your leave request (4–24 Aug) was approved. Any days beyond your accrued paid leave balance will be unpaid.",
    },
    { user: dev2._id, type: "salary_credited", message: "Your August salary has been credited." },
    { user: cybersec1._id, type: "leave_status", message: "Your leave request (18–19 Aug) was rejected." },
    { user: smpm1._id, type: "leave_status", message: "Your leave request (17–19 Aug) was approved." },
    { user: intern1._id, type: "leave_status", message: "Your leave request (20–21 Aug) was approved." },
    { user: admin1._id, type: "announcement", message: "New attendance policy effective next month." },
    { user: hr1._id, type: "meeting", message: "Sprint planning scheduled for 24 Aug, 10:30 AM." },
  ]);

  console.log("\nSeed complete. Sample login credentials (password for all: %s):\n", PASSWORD);
  for (const u of SAMPLE_USERS) {
    console.log(`  ${u.role.padEnd(42)} ${u.email}`);
  }
  console.log("");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
