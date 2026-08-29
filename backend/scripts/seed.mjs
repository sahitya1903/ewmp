import { connectDB } from "../src/lib/db.js";
import { hashPassword } from "../src/lib/auth.js";
import mongoose from "mongoose";
import { getHolidaySet, isWorkingDay } from "../src/lib/workingDays.js";
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

const PASSWORD = "Test@1234";

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Joining dates are spread across the last two months (as of this seed's fictional
// "today" of late Aug 2026), keeping a few employees early enough that the crafted
// leave/absence scenarios below (which reference specific August dates) still land
// after they joined.
const SAMPLE_USERS = [
  { employeeId: "EMP001", name: "Aarav Shah", email: "dev1@ewmp.test", role: "Developer_E", phone: "9000000001", monthlySalary: 55000, joiningDate: "2026-07-15" },
  { employeeId: "EMP002", name: "Priya Nair", email: "dev2@ewmp.test", role: "Developer_E", phone: "9000000002", monthlySalary: 60000, joiningDate: "2026-06-29" },
  { employeeId: "EMP003", name: "Rohan Mehta", email: "cybersec1@ewmp.test", role: "Cyber Security_E", phone: "9000000003", monthlySalary: 65000, joiningDate: "2026-07-08" },
  { employeeId: "EMP004", name: "Sneha Kulkarni", email: "smpm1@ewmp.test", role: "Social Media & Performance Marketing_E", phone: "9000000004", monthlySalary: 48000, joiningDate: "2026-07-22" },
  { employeeId: "EMP005", name: "Vikram Rao", email: "accounts1@ewmp.test", role: "Accounts_E", phone: "9000000005", monthlySalary: 52000, joiningDate: "2026-07-05" },
  { employeeId: "EMP006", name: "Neha Joshi", email: "admin1@ewmp.test", role: "Admin", phone: "9000000006", monthlySalary: 58000, joiningDate: "2026-07-11" },
  { employeeId: "EMP007", name: "Karan Malhotra", email: "hr1@ewmp.test", role: "Management", phone: "9000000007", monthlySalary: 90000, joiningDate: "2026-07-02" },
  { employeeId: "INT001", name: "Ananya Verma", email: "intern1@ewmp.test", role: "Intern", phone: "9000000008", monthlySalary: 15000, joiningDate: "2026-07-18" },
  { employeeId: "INT002", name: "Rahul Singh", email: "intern2@ewmp.test", role: "Intern", phone: "9000000009", monthlySalary: 12000, joiningDate: "2026-08-05" },
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

  // dev1: takes exactly the 2-day monthly quota (25-26 Aug, both working days) -> fully paid, no deduction.
  const leave1 = await LeaveRequest.create({
    user: dev1._id,
    fromDate: new Date("2026-08-25"),
    toDate: new Date("2026-08-26"),
    reason: "Family function",
    status: "Approved",
    reviewedBy: hr1._id,
    reviewedAt: new Date("2026-08-21"),
  });

  // dev2: awaiting review (demonstrates the pending-approval workflow).
  await LeaveRequest.create({
    user: dev2._id,
    fromDate: new Date("2026-08-28"),
    toDate: new Date("2026-08-28"),
    reason: "Medical appointment",
    status: "Pending",
  });

  // dev2: approved leave spanning 3 working days (4-6 Aug, skipping the Aug 3
  // Monday weekly off) -> only the first 2 are within the monthly paid-leave
  // quota, the 3rd is unpaid and deducts salary.
  const leave2 = await LeaveRequest.create({
    user: dev2._id,
    fromDate: new Date("2026-08-04"),
    toDate: new Date("2026-08-06"),
    reason: "Family event",
    status: "Approved",
    reviewedBy: hr1._id,
    reviewedAt: new Date("2026-08-02"),
  });

  await LeaveRequest.create({
    user: cybersec1._id,
    fromDate: new Date("2026-08-18"),
    toDate: new Date("2026-08-19"),
    reason: "Personal work",
    status: "Rejected",
    reviewedBy: hr1._id,
    reviewedAt: new Date("2026-08-17"),
  });

  // Crafted attendance scenarios — these dates are reserved and won't be touched by
  // the general Present-day generator below.
  const attendanceRows = [];

  // dev1's paid leave (both days within quota).
  attendanceRows.push({
    user: dev1._id,
    date: new Date("2026-08-25"),
    status: "Leave",
    paidLeave: true,
    leaveRequest: leave1._id,
  });
  attendanceRows.push({
    user: dev1._id,
    date: new Date("2026-08-26"),
    status: "Leave",
    paidLeave: true,
    leaveRequest: leave1._id,
  });

  // dev2's leave: first 2 working days paid, 3rd exceeds the monthly quota and is unpaid.
  attendanceRows.push({
    user: dev2._id,
    date: new Date("2026-08-04"),
    status: "Leave",
    paidLeave: true,
    leaveRequest: leave2._id,
  });
  attendanceRows.push({
    user: dev2._id,
    date: new Date("2026-08-05"),
    status: "Leave",
    paidLeave: true,
    leaveRequest: leave2._id,
  });
  attendanceRows.push({
    user: dev2._id,
    date: new Date("2026-08-06"),
    status: "Leave",
    paidLeave: false,
    leaveRequest: leave2._id,
  });

  // dev2: one admin-marked absence, unrelated to the leave request above.
  attendanceRows.push({ user: dev2._id, date: new Date("2026-08-20"), status: "Absent", markedBy: admin1._id });

  // cybersec1: admin-marked absences (not via a leave request) -> always unpaid/deducted.
  // (11-13 Aug, skipping the Aug 10 Monday weekly off.)
  attendanceRows.push({ user: cybersec1._id, date: new Date("2026-08-11"), status: "Absent", markedBy: admin1._id });
  attendanceRows.push({ user: cybersec1._id, date: new Date("2026-08-12"), status: "Absent", markedBy: admin1._id });
  attendanceRows.push({ user: cybersec1._id, date: new Date("2026-08-13"), status: "Absent", markedBy: admin1._id });

  await Attendance.insertMany(attendanceRows);

  // A submitted work update is what marks a day Present in the live app, so every
  // employee gets a full Present + work-update history from their joining date up
  // to today — "today" is the real current date, so freshly seeded data always
  // includes today, ready for Admin to verify on the Today's Work Updates screen.
  // A couple of specific days keep hand-written content for narrative flavor; the
  // rest get a randomly assigned (but consistent per employee) project and varied
  // but plausible progress notes.
  const seedToday = new Date();
  seedToday.setUTCHours(0, 0, 0, 0);

  const holidaySet = await getHolidaySet(new Date(Date.UTC(2026, 5, 1)), new Date(Date.UTC(2027, 1, 1)));
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
      date: new Date("2026-08-21"),
      currentProject: "Internal Billing Tool",
      todaysProgress: "Fixed invoice PDF export bug",
      remainingWork: "Write regression tests",
      estimatedCompletion: new Date("2026-08-24"),
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

  // dev1: 2 paid leave days, no absences -> full salary, no deduction. (Recomputed
  // live from the attendance above on first view — these are just starting values.)
  const salary1 = await Salary.create({
    user: dev1._id,
    month: 8,
    year: 2026,
    workingDays: 22,
    presentDays: 20,
    leaveDays: 2,
    paidLeaveDays: 2,
    unpaidLeaveDays: 0,
    absentDays: 0,
    monthlySalary: 55000,
    dailySalary: Math.round((55000 / 22) * 100) / 100,
    salaryPayable: Math.round((55000 / 22) * 22 * 100) / 100,
  });
  await SalaryPayment.create({
    salary: salary1._id,
    user: dev1._id,
    credited: false,
  });

  // dev2: 1 admin-marked absence + 1 unpaid leave day (beyond the monthly quota) -> deducted.
  const salary2 = await Salary.create({
    user: dev2._id,
    month: 8,
    year: 2026,
    workingDays: 22,
    presentDays: 18,
    leaveDays: 3,
    paidLeaveDays: 2,
    unpaidLeaveDays: 1,
    absentDays: 1,
    monthlySalary: 60000,
    dailySalary: Math.round((60000 / 22) * 100) / 100,
    salaryPayable: Math.round((60000 / 22) * 20 * 100) / 100,
  });
  await SalaryPayment.create({
    salary: salary2._id,
    user: dev2._id,
    credited: true,
    creditedDate: new Date("2026-08-20"),
    creditedBy: accounts1._id,
  });

  await Meeting.create({
    title: "Sprint planning",
    description: "Plan next two-week sprint for the portal",
    dateTime: new Date("2026-08-24T10:30:00"),
    participants: [dev1._id, dev2._id, cybersec1._id, hr1._id],
    createdBy: hr1._id,
  });

  await Notification.insertMany([
    { user: dev1._id, type: "leave_status", message: "Your leave request (25–26 Aug) was approved." },
    {
      user: dev2._id,
      type: "leave_status",
      message: "Your leave request (4–6 Aug) was approved. 1 day exceeds your monthly paid leave quota and will be unpaid.",
    },
    { user: dev2._id, type: "salary_credited", message: "Your August salary has been credited." },
    { user: cybersec1._id, type: "leave_status", message: "Your leave request (18–19 Aug) was rejected." },
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
