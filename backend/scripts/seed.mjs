import { connectDB } from "../src/lib/db.js";
import { hashPassword } from "../src/lib/auth.js";
import mongoose from "mongoose";
import Role, { ROLE_NAMES } from "../src/models/Role.js";
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

const SAMPLE_USERS = [
  { employeeId: "EMP001", name: "Aarav Shah", email: "dev1@ewmp.test", role: "Developer_E", phone: "9000000001", monthlySalary: 55000, joiningDate: "2024-01-15" },
  { employeeId: "EMP002", name: "Priya Nair", email: "dev2@ewmp.test", role: "Developer_E", phone: "9000000002", monthlySalary: 60000, joiningDate: "2023-11-01" },
  { employeeId: "EMP003", name: "Rohan Mehta", email: "cybersec1@ewmp.test", role: "Cyber Security_E", phone: "9000000003", monthlySalary: 65000, joiningDate: "2024-03-10" },
  { employeeId: "EMP004", name: "Sneha Kulkarni", email: "smpm1@ewmp.test", role: "Social Media & Performance Marketing_E", phone: "9000000004", monthlySalary: 48000, joiningDate: "2024-06-01" },
  { employeeId: "EMP005", name: "Vikram Rao", email: "accounts1@ewmp.test", role: "Accounts_E", phone: "9000000005", monthlySalary: 52000, joiningDate: "2023-08-20" },
  { employeeId: "EMP006", name: "Neha Joshi", email: "admin1@ewmp.test", role: "Admin", phone: "9000000006", monthlySalary: 58000, joiningDate: "2023-05-05" },
  { employeeId: "EMP007", name: "Karan Malhotra", email: "management1@ewmp.test", role: "Management", phone: "9000000007", monthlySalary: 90000, joiningDate: "2022-09-12" },
];

async function seed() {
  await connectDB();

  await Promise.all([
    Role.deleteMany({}),
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

  await Role.insertMany(ROLE_NAMES.map((name) => ({ name })));

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

  const [dev1, dev2, cybersec1, smpm1, accounts1, admin1, management1] = users;

  await Holiday.insertMany([
    { date: new Date("2026-08-15"), name: "Independence Day" },
    { date: new Date("2026-10-02"), name: "Gandhi Jayanti" },
    { date: new Date("2026-11-08"), name: "Diwali" },
    { date: new Date("2027-01-01"), name: "New Year's Day" },
  ]);

  const leave1 = await LeaveRequest.create({
    user: dev1._id,
    fromDate: new Date("2026-08-25"),
    toDate: new Date("2026-08-26"),
    reason: "Family function",
    status: "Approved",
    reviewedBy: management1._id,
    reviewedAt: new Date("2026-08-21"),
  });
  await LeaveRequest.create({
    user: dev2._id,
    fromDate: new Date("2026-08-28"),
    toDate: new Date("2026-08-28"),
    reason: "Medical appointment",
    status: "Pending",
  });
  await LeaveRequest.create({
    user: cybersec1._id,
    fromDate: new Date("2026-08-18"),
    toDate: new Date("2026-08-19"),
    reason: "Personal work",
    status: "Rejected",
    reviewedBy: management1._id,
    reviewedAt: new Date("2026-08-17"),
  });

  const today = new Date("2026-08-22");
  const attendanceRows = [];
  for (let i = 1; i <= 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    attendanceRows.push({ user: dev1._id, date, status: "Present" });
    attendanceRows.push({ user: dev2._id, date, status: i === 2 ? "Absent" : "Present" });
    attendanceRows.push({ user: cybersec1._id, date, status: "Present" });
  }
  attendanceRows.push({ user: dev1._id, date: new Date("2026-08-25"), status: "Leave", leaveRequest: leave1._id });
  attendanceRows.push({ user: dev1._id, date: new Date("2026-08-26"), status: "Leave", leaveRequest: leave1._id });
  await Attendance.insertMany(attendanceRows);

  await DailyWorkUpdate.insertMany([
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
  ]);

  const salary1 = await Salary.create({
    user: dev1._id,
    month: 8,
    year: 2026,
    workingDays: 22,
    presentDays: 20,
    leaveDays: 2,
    absentDays: 0,
    dailySalary: Math.round((55000 / 22) * 100) / 100,
    salaryPayable: Math.round((55000 / 22) * 22 * 100) / 100,
  });
  await SalaryPayment.create({
    salary: salary1._id,
    user: dev1._id,
    credited: false,
  });

  const salary2 = await Salary.create({
    user: dev2._id,
    month: 8,
    year: 2026,
    workingDays: 22,
    presentDays: 21,
    leaveDays: 0,
    absentDays: 1,
    dailySalary: Math.round((60000 / 22) * 100) / 100,
    salaryPayable: Math.round((60000 / 22) * 21 * 100) / 100,
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
    participants: [dev1._id, dev2._id, cybersec1._id, management1._id],
    createdBy: management1._id,
  });

  await Notification.insertMany([
    { user: dev1._id, type: "leave_status", message: "Your leave request (25–26 Aug) was approved." },
    { user: dev2._id, type: "salary_credited", message: "Your August salary has been credited." },
    { user: cybersec1._id, type: "leave_status", message: "Your leave request (18–19 Aug) was rejected." },
    { user: admin1._id, type: "announcement", message: "New attendance policy effective next month." },
    { user: management1._id, type: "meeting", message: "Sprint planning scheduled for 24 Aug, 10:30 AM." },
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
