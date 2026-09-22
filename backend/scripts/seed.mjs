import { connectDB } from "../src/lib/db.js";
import { hashPassword } from "../src/lib/auth.js";
import mongoose from "mongoose";
import { getHolidaySet, isWorkingDay, isWeeklyOff } from "../src/lib/workingDays.js";
import { startOfDay, eachDate } from "../src/lib/dates.js";
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
import Notification from "../src/models/Notification.js";
import Notice from "../src/models/Notice.js";
import CustomRole from "../src/models/CustomRole.js";
import { NO_DASHBOARD_ROLES } from "../src/lib/roles.js";

const PASSWORD = "Test@1234";

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Joining dates are all on/after 1 Aug 2026 (per the current onboarding cutoff),
// staggered across the first two weeks of the month so the seed still shows off
// a mix: some joined exactly on the 1st (a full month counts for salary), some
// mid-month (that month's salary is prorated for the pre-joining days). With
// dates this recent, paid-leave accrual (1.75/completed month) is thin — often
// 0-1 day by the time the seed runs — so leave taken in this data lands mostly
// or fully unpaid, same as it would for any real brand-new hire.
const SAMPLE_USERS = [
  { employeeId: "EMP001", name: "Aarav Shah", email: "dev1@ewmp.test", role: "Developer_E", phone: "9000000001", monthlySalary: 55000, joiningDate: "2026-08-01" },
  { employeeId: "EMP002", name: "Priya Nair", email: "dev2@ewmp.test", role: "Developer_E", phone: "9000000002", monthlySalary: 60000, joiningDate: "2026-08-01" },
  { employeeId: "EMP003", name: "Rohan Mehta", email: "cybersec1@ewmp.test", role: "Cyber Security_E", phone: "9000000003", monthlySalary: 65000, joiningDate: "2026-08-03" },
  { employeeId: "EMP004", name: "Sneha Kulkarni", email: "smpm1@ewmp.test", role: "Social Media & Performance Marketing_E", phone: "9000000004", monthlySalary: 48000, joiningDate: "2026-08-05" },
  { employeeId: "EMP005", name: "Vikram Rao", email: "accounts1@ewmp.test", role: "Accounts_E", phone: "9000000005", monthlySalary: 52000, joiningDate: "2026-08-01" },
  { employeeId: "EMP006", name: "Neha Joshi", email: "admin1@ewmp.test", role: "Admin", phone: "9000000006", monthlySalary: 58000, joiningDate: "2026-08-01" },
  { employeeId: "EMP007", name: "Karan Malhotra", email: "hr1@ewmp.test", role: "HR", phone: "9000000007", monthlySalary: 90000, joiningDate: "2026-08-01" },
  { employeeId: "INT001", name: "Ananya Verma", email: "intern1@ewmp.test", role: "Intern", phone: "9000000008", monthlySalary: 15000, joiningDate: "2026-08-10" },
  { employeeId: "INT002", name: "Rahul Singh", email: "intern2@ewmp.test", role: "Intern", phone: "9000000009", monthlySalary: 12000, joiningDate: "2026-08-15" },
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
    Notification.deleteMany({}),
    Notice.deleteMany({}),
    CustomRole.deleteMany({}),
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
    { date: new Date("2026-12-25"), name: "Christmas" },
    { date: new Date("2027-01-01"), name: "New Year's Day" },
    { date: new Date("2027-01-26"), name: "Republic Day" },
    { date: new Date("2027-03-04"), name: "Holi" },
  ]);

  // "Today" is the real current date, not a fixed one, so freshly seeded data
  // always includes today — ready for Admin to verify on the Today's Work
  // Updates screen, and so date-relative scenarios (like the pending leave
  // below) never drift into the past as time goes on.
  const seedToday = startOfDay();
  const inDays = (n) => {
    const d = new Date(seedToday);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  };
  // Nudges a date off Monday (the weekly off) — nothing gets scheduled on it,
  // notices/meetings included.
  const skipWeeklyOff = (date) => {
    const d = new Date(date);
    while (isWeeklyOff(d)) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  };

  const holidaySet = await getHolidaySet(new Date(Date.UTC(2026, 7, 1)), new Date(Date.UTC(2027, 3, 1)));
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

  // A work update is submitted on its own day — stamp createdAt/updatedAt to a
  // plausible end-of-day time so the "submitted"/"edited" times aren't all the
  // moment the seed ran.
  const submittedAt = (date, hoursAfterMidnight = 18) => {
    const stamp = new Date(new Date(date).getTime() + hoursAfterMidnight * 3600 * 1000);
    return stamp > new Date() ? new Date() : stamp; // today's update can't be "submitted" in the future
  };

  const HAND_WRITTEN_UPDATES = [
    {
      user: dev1._id,
      date: new Date("2026-08-21"),
      slot: "start",
      todaysTask: "Build auth API and login page",
      blocker: "None",
      endGoal: "Auth API and login page working end-to-end",
      createdAt: submittedAt("2026-08-21", 9),
      updatedAt: submittedAt("2026-08-21", 9),
    },
    {
      user: dev1._id,
      date: new Date("2026-08-21"),
      slot: "end",
      todaysTask: "Built auth API and login page",
      blocker: "None",
      progress: "Auth API and login page done; role-based dashboards still remain",
      createdAt: submittedAt("2026-08-21", 17),
      updatedAt: submittedAt("2026-08-21", 20), // revised later that evening
      // A resolved, closed follow-up thread — shows under "past follow-ups".
      followUps: [
        {
          kind: "request",
          text: "Which auth strategy did you go with — sessions or JWT?",
          by: hr1._id,
          at: submittedAt("2026-08-21", 21),
        },
        {
          kind: "response",
          text: "JWT in an httpOnly cookie, 7-day expiry. Notes are in the PR description.",
          by: dev1._id,
          at: submittedAt("2026-08-22", 10),
        },
      ],
      followUpClosedAt: submittedAt("2026-08-22", 11),
      followUpClosedBy: hr1._id,
    },
    {
      user: dev2._id,
      date: new Date("2026-08-27"),
      slot: "start",
      todaysTask: "Fix invoice PDF export bug",
      blocker: "None",
      endGoal: "Invoice PDF export working for all templates",
      createdAt: submittedAt("2026-08-27", 9),
      updatedAt: submittedAt("2026-08-27", 9),
    },
    {
      user: dev2._id,
      date: new Date("2026-08-27"),
      slot: "end",
      todaysTask: "Fixed invoice PDF export bug",
      blocker: "None",
      progress: "Export bug fixed; also helped onboard the new intern",
      createdAt: submittedAt("2026-08-27", 18),
      updatedAt: submittedAt("2026-08-27", 18),
    },
  ];
  const handWrittenKeys = new Set(HAND_WRITTEN_UPDATES.map((u) => `${u.user.toString()}:${dateKey(u.date)}`));

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

  // Each employee sticks to one randomly-picked task thread across their whole history.
  const taskByUserId = new Map(users.map((u) => [u._id.toString(), pick(TASK_POOL)]));

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
          // Admin/HR/Accounts never submit daily work updates — see
          // authController.me, which marks their attendance on login instead.
          if (!handWrittenKeys.has(key) && !NO_DASHBOARD_ROLES.includes(SAMPLE_USERS[i].role)) {
            const task = taskByUserId.get(user._id.toString());
            generatedUpdates.push({
              user: user._id,
              date: new Date(cursor),
              slot: "start",
              todaysTask: task,
              blocker: pick(BLOCKER_NOTES),
              endGoal: `Move ${task} forward`,
              createdAt: submittedAt(cursor, 9),
              updatedAt: submittedAt(cursor, 9),
            });
            generatedUpdates.push({
              user: user._id,
              date: new Date(cursor),
              slot: "end",
              todaysTask: task,
              blocker: pick(BLOCKER_NOTES),
              progress: pick(PROGRESS_NOTES),
              createdAt: submittedAt(cursor),
              updatedAt: submittedAt(cursor),
            });
          }
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  await Attendance.insertMany(generatedAttendance);
  // timestamps: false so our own createdAt/updatedAt survive instead of being
  // overwritten with "now".
  await DailyWorkUpdate.insertMany([...HAND_WRITTEN_UPDATES, ...generatedUpdates], { timestamps: false });

  // An open follow-up on dev1's most recent end-of-day update, so logging in as
  // dev1 shows an actionable "Follow-up requests" card on the dashboard.
  const dev1Latest = await DailyWorkUpdate.findOne({ user: dev1._id, slot: "end" }).sort({ date: -1 });
  if (dev1Latest) {
    dev1Latest.followUps.push({
      kind: "request",
      text: "Can you add the ticket number for the fix you mentioned?",
      by: admin1._id,
      at: new Date(),
    });
    await dev1Latest.save();
  }

  // ---- Salary history -----------------------------------------------------
  // Compute every employee's salary for each month from the one they joined in
  // up to and including the current month (all recomputed live on first view —
  // these are just persisted starting values). Every *past* month is then marked
  // credited by Admin / HR / Accounts in rotation; the current month is
  // still in progress, so it stays pending.
  //
  // Where a month carried an attendance-based deduction, or where Accounts
  // recovered money for damaged or lost office property, the payment gets a
  // remark spelling out why — and for the property cases the amount actually
  // credited is set below the computed payable.
  const crediterIds = [admin1._id, hr1._id, accounts1._id];

  // Curated months where the amount paid was deliberately *less* than the
  // computed payable. Keyed by "<employeeId>:<year>-<month>". With everyone
  // joining in August 2026, that's the only month that's both after joining
  // and fully in the past by the time this seed runs — so it's the only key
  // that can ever match.
  const propertyRecoveries = {
    "EMP005:2026-8": { amount: 1000, remark: "Rs 1,000 recovered for a misplaced access card." },
    "INT002:2026-8": { amount: 500, remark: "Rs 500 recovered for a damaged HDMI cable." },
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

  // Admin-posted notices / meeting links — visible to every employee and shown
  // on the calendar. Notices double as meeting entries: a dated notice with a
  // link is a meeting. One just past, the rest upcoming (relative to "today").
  // Nobody's in on Monday, so none of these ever land on one.
  const notices = await Notice.insertMany([
    {
      title: "Sprint planning",
      body: "Plan the next two-week sprint for the portal. Dev and security to attend.",
      link: "https://meet.google.com/klm-nopq-rst",
      date: skipWeeklyOff(inDays(1)),
      createdBy: hr1._id,
    },
    {
      title: "Monthly all-hands",
      body: "Company-wide update on Q3 progress and the roadmap ahead. Attendance expected for everyone.",
      link: "https://meet.google.com/abc-defg-hij",
      date: skipWeeklyOff(inDays(3)),
      createdBy: admin1._id,
    },
    {
      title: "Office closed for maintenance",
      body: "The office will be closed for electrical maintenance — work from home that day.",
      date: skipWeeklyOff(inDays(10)),
      createdBy: admin1._id,
    },
    {
      title: "New attendance policy briefing",
      body: "Walkthrough of the updated attendance and work-update policy that took effect this month.",
      link: "https://meet.google.com/xyz-uvwx-yz",
      date: skipWeeklyOff(inDays(-4)),
      createdBy: admin1._id,
    },
  ]);

  // In-app notifications. Posting a notice fans an "announcement" out to every
  // other employee (same as the live app does); the older briefing is already
  // read, the two recent ones are still unread.
  const notifications = [
    { user: dev1._id, type: "leave_status", message: "Your leave request (25 Aug 2026 – 26 Aug 2026) was approved.", isRead: true },
    { user: dev2._id, type: "leave_status", message: "Your leave request (4 Aug 2026 – 24 Aug 2026) was approved.", isRead: true },
    { user: dev2._id, type: "salary_credited", message: "Your salary for August 2026 (₹54,193) has been credited." },
    { user: dev1._id, type: "follow_up", message: "Neha Joshi asked for a follow-up on your work update: Can you add the ticket number for the fix you mentioned?" },
    { user: cybersec1._id, type: "leave_status", message: "Your leave request (18 Aug 2026 – 19 Aug 2026) was rejected.", isRead: true },
    { user: smpm1._id, type: "leave_status", message: "Your leave request (17 Aug 2026 – 19 Aug 2026) was approved.", isRead: true },
    { user: intern1._id, type: "leave_status", message: "Your leave request (20 Aug 2026 – 21 Aug 2026) was approved.", isRead: true },
  ];
  for (const notice of notices) {
    const past = notice.date < seedToday;
    for (const user of users) {
      if (user._id.equals(admin1._id)) continue;
      notifications.push({
        user: user._id,
        type: "announcement",
        message: `New notice: ${notice.title}`,
        link: notice.link || undefined,
        isRead: past,
      });
    }
  }
  await Notification.insertMany(notifications);

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
