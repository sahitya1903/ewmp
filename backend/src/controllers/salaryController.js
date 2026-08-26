import User from "../models/User.js";
import Salary from "../models/Salary.js";
import SalaryPayment from "../models/SalaryPayment.js";
import { computeSalaryForUser } from "../lib/salaryCalc.js";

function toDTO(salary, payment, user) {
  // Deduction reflects only attendance-based loss (absences, unpaid leave beyond
  // quota) — not the part of the month before the employee joined, which is a
  // proration rather than a deduction.
  const deduction = Math.round(salary.dailySalary * (salary.absentDays + salary.unpaidLeaveDays) * 100) / 100;
  return {
    id: salary._id,
    user: { id: user._id, employeeId: user.employeeId, name: user.name, role: user.role },
    month: salary.month,
    year: salary.year,
    workingDays: salary.workingDays,
    presentDays: salary.presentDays,
    leaveDays: salary.leaveDays,
    paidLeaveDays: salary.paidLeaveDays,
    unpaidLeaveDays: salary.unpaidLeaveDays,
    absentDays: salary.absentDays,
    monthlySalary: salary.monthlySalary,
    dailySalary: salary.dailySalary,
    deduction,
    salaryPayable: salary.salaryPayable,
    credited: payment?.credited ?? false,
    creditedDate: payment?.creditedDate ?? null,
  };
}

export async function listSalaries(req, res) {
  const month = Number(req.query.month);
  const year = Number(req.query.year);

  if (!month || !year) {
    return res.status(400).json({ error: "month and year are required" });
  }

  const isReviewer = ["Accounts_E", "Admin", "Management"].includes(req.user.role);
  const users = isReviewer
    ? await User.find({ isActive: true })
    : await User.find({ _id: req.user.sub });

  const salaries = [];
  for (const user of users) {
    const salary = await computeSalaryForUser(user._id, month, year);
    if (!salary) continue;
    const payment = await SalaryPayment.findOne({ salary: salary._id });
    salaries.push(toDTO(salary, payment, user));
  }

  salaries.sort((a, b) => a.user.employeeId.localeCompare(b.user.employeeId));

  res.json({ salaries });
}

export async function updateCredited(req, res) {
  const { id } = req.params;
  const { credited } = req.body;

  if (typeof credited !== "boolean") {
    return res.status(400).json({ error: "credited must be a boolean" });
  }

  const salary = await Salary.findById(id);
  if (!salary) return res.status(404).json({ error: "Salary record not found" });

  const payment = await SalaryPayment.findOneAndUpdate(
    { salary: salary._id },
    {
      $set: {
        credited,
        creditedDate: credited ? new Date() : null,
        creditedBy: credited ? req.user.sub : null,
      },
      $setOnInsert: { user: salary.user },
    },
    { upsert: true, returnDocument: "after" }
  );

  res.json({ credited: payment.credited, creditedDate: payment.creditedDate });
}
