import User from "../models/User.js";
import Salary from "../models/Salary.js";
import SalaryPayment from "../models/SalaryPayment.js";
import { computeSalaryForUser } from "../lib/salaryCalc.js";
import { REVIEWER_ROLES } from "../lib/roles.js";

function fmtUser(u) {
  return u && u._id ? { id: u._id, name: u.name, role: u.role } : null;
}

// The credit history shown behind the "History" button. Prefer the recorded
// history array; fall back to reconstructing it from the flat credited/revised
// fields for payments saved before history tracking existed.
function buildHistory(payment) {
  if (!payment) return [];
  if (payment.history?.length) {
    return payment.history.map((h) => ({
      action: h.action,
      amount: h.amount ?? null,
      remark: h.remark ?? null,
      at: h.at ?? null,
      by: fmtUser(h.by),
    }));
  }
  const entries = [];
  if (payment.credited && payment.creditedBy) {
    entries.push({
      action: "credited",
      amount: payment.amountCredited ?? null,
      remark: payment.revisedBy ? null : payment.remark ?? null,
      at: payment.creditedDate ?? null,
      by: fmtUser(payment.creditedBy),
    });
  }
  if (payment.revisedBy) {
    entries.push({
      action: "revised",
      amount: payment.amountCredited ?? null,
      remark: payment.remark ?? null,
      at: payment.revisedDate ?? null,
      by: fmtUser(payment.revisedBy),
    });
  }
  return entries;
}

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
    amountCredited: payment?.amountCredited ?? null,
    remark: payment?.remark ?? null,
    creditedBy: fmtUser(payment?.creditedBy),
    revisedDate: payment?.revisedDate ?? null,
    revisedBy: fmtUser(payment?.revisedBy),
  };
}

export async function listSalaries(req, res) {
  const month = Number(req.query.month);
  const year = Number(req.query.year);

  if (!month || !year) {
    return res.status(400).json({ error: "month and year are required" });
  }

  const isReviewer = [...REVIEWER_ROLES, "Accounts_E"].includes(req.user.role);
  const users = isReviewer
    ? await User.find({ isActive: true })
    : await User.find({ _id: req.user.sub });

  const salaries = [];
  for (const user of users) {
    const salary = await computeSalaryForUser(user._id, month, year);
    if (!salary) continue;
    const payment = await SalaryPayment.findOne({ salary: salary._id })
      .populate("creditedBy", "name role")
      .populate("revisedBy", "name role");
    salaries.push(toDTO(salary, payment, user));
  }

  salaries.sort((a, b) => a.user.employeeId.localeCompare(b.user.employeeId));

  res.json({ salaries });
}

// Combined credit history for every employee in a given month — one row per
// credit action (first credit and every later revision), newest first.
export async function listSalaryHistory(req, res) {
  const month = Number(req.query.month);
  const year = Number(req.query.year);

  if (!month || !year) {
    return res.status(400).json({ error: "month and year are required" });
  }

  const salaries = await Salary.find({ month, year }, "_id");
  const payments = await SalaryPayment.find({ salary: { $in: salaries.map((s) => s._id) } })
    .populate("user", "name employeeId")
    .populate("creditedBy", "name role")
    .populate("revisedBy", "name role")
    .populate("history.by", "name role");

  const entries = [];
  for (const payment of payments) {
    const who = payment.user
      ? { id: payment.user._id, name: payment.user.name, employeeId: payment.user.employeeId }
      : null;
    for (const h of buildHistory(payment)) {
      entries.push({ user: who, ...h });
    }
  }

  entries.sort((a, b) => new Date(b.at ?? 0) - new Date(a.at ?? 0));
  res.json({ month, year, history: entries });
}

export async function updateCredited(req, res) {
  const { id } = req.params;
  const { credited, amountCredited, remark } = req.body;

  if (typeof credited !== "boolean") {
    return res.status(400).json({ error: "credited must be a boolean" });
  }
  if (credited && (typeof amountCredited !== "number" || amountCredited <= 0)) {
    return res.status(400).json({ error: "amountCredited must be a positive number" });
  }
  if (remark != null && typeof remark !== "string") {
    return res.status(400).json({ error: "remark must be a string" });
  }
  const trimmedRemark = typeof remark === "string" ? remark.trim() : "";

  const salary = await Salary.findById(id);
  if (!salary) return res.status(404).json({ error: "Salary record not found" });

  const existing = await SalaryPayment.findOne({ salary: salary._id });
  // Editing an already-credited record (e.g. to fix a wrong amount someone else
  // entered) keeps the original credit date and crediting user untouched, and
  // separately stamps who last revised it and when — so the payment always shows
  // both who first credited it and who corrected it later.
  const keepStamp = credited && existing?.credited;

  const now = new Date();
  const update = {
    $set: {
      credited,
      creditedDate: !credited ? null : keepStamp ? existing.creditedDate : now,
      creditedBy: !credited ? null : keepStamp ? existing.creditedBy : req.user.sub,
      amountCredited: credited ? amountCredited : null,
      remark: credited ? trimmedRemark || null : null,
      revisedDate: keepStamp ? now : null,
      revisedBy: keepStamp ? req.user.sub : null,
    },
    $setOnInsert: { user: salary.user },
  };

  // Log this action in the history, but only when something actually changed.
  let action = null;
  if (credited && !existing?.credited) action = "credited";
  else if (credited && existing?.credited) action = "revised";
  else if (!credited && existing?.credited) action = "uncredited";

  if (action) {
    update.$push = {
      history: {
        action,
        amount: credited ? amountCredited : existing?.amountCredited ?? null,
        remark: credited ? trimmedRemark || null : null,
        by: req.user.sub,
        at: now,
      },
    };
  }

  await SalaryPayment.findOneAndUpdate({ salary: salary._id }, update, {
    upsert: true,
    returnDocument: "after",
  });

  const payment = await SalaryPayment.findOne({ salary: salary._id })
    .populate("creditedBy", "name role")
    .populate("revisedBy", "name role")
    .populate("history.by", "name role");
  res.json({
    credited: payment.credited,
    creditedDate: payment.creditedDate,
    amountCredited: payment.amountCredited,
    remark: payment.remark ?? null,
    creditedBy: fmtUser(payment.creditedBy),
    revisedDate: payment.revisedDate ?? null,
    revisedBy: fmtUser(payment.revisedBy),
    history: buildHistory(payment),
  });
}
