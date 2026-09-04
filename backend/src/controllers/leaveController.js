import LeaveRequest from "../models/LeaveRequest.js";
import Attendance from "../models/Attendance.js";
import DailyWorkUpdate from "../models/DailyWorkUpdate.js";
import User from "../models/User.js";
import { getHolidaySet, isWorkingDay } from "../lib/workingDays.js";
import { assignPaidStatusForDates, getLeaveBalance } from "../lib/leavePolicy.js";
import { startOfDay, eachDate, isValidDate } from "../lib/dates.js";
import { notify } from "../lib/notify.js";
import { REVIEWER_ROLES } from "../lib/roles.js";

function fmtDay(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function currentYear() {
  return startOfDay().getUTCFullYear();
}

export async function applyLeave(req, res) {
  const { fromDate, toDate, reason } = req.body;

  if (!fromDate || !toDate || !reason) {
    return res.status(400).json({ error: "fromDate, toDate, and reason are required" });
  }
  if (!isValidDate(fromDate) || !isValidDate(toDate)) {
    return res.status(400).json({ error: "fromDate and toDate must be valid dates" });
  }

  const from = startOfDay(fromDate);
  const to = startOfDay(toDate);

  if (from > to) {
    return res.status(400).json({ error: "fromDate must be on or before toDate" });
  }

  if (from < startOfDay(new Date())) {
    return res.status(400).json({ error: "Leave can only be applied for today or a future date" });
  }

  const leaveRequest = await LeaveRequest.create({
    user: req.user.sub,
    fromDate: from,
    toDate: to,
    reason,
  });

  res.status(201).json({ leaveRequest });
}

export async function listLeaveRequests(req, res) {
  const isReviewer = REVIEWER_ROLES.includes(req.user.role);
  const filter = isReviewer ? {} : { user: req.user.sub };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const leaveRequests = await LeaveRequest.find(filter)
    .populate("user", "employeeId name email role")
    .populate("reviewedBy", "name")
    .sort({ createdAt: -1 });

  res.json({ leaveRequests });
}

export async function reviewLeaveRequest(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be Approved or Rejected" });
  }

  const leaveRequest = await LeaveRequest.findById(id);
  if (!leaveRequest) return res.status(404).json({ error: "Leave request not found" });
  if (leaveRequest.status !== "Pending") {
    return res.status(400).json({ error: "This leave request has already been reviewed" });
  }

  leaveRequest.status = status;
  leaveRequest.reviewedBy = req.user.sub;
  leaveRequest.reviewedAt = new Date();
  await leaveRequest.save();

  if (status === "Approved") {
    const allDates = eachDate(leaveRequest.fromDate, leaveRequest.toDate);
    const holidaySet = await getHolidaySet(allDates[0], new Date(allDates[allDates.length - 1].getTime() + 86400000));
    const workingDates = allDates.filter((date) => isWorkingDay(date, holidaySet));

    const assignments = await assignPaidStatusForDates(leaveRequest.user, workingDates);

    await Promise.all(
      assignments.map(({ date, paid }) =>
        Attendance.findOneAndUpdate(
          { user: leaveRequest.user, date },
          {
            $set: {
              status: "Leave",
              paidLeave: paid,
              leaveRequest: leaveRequest._id,
              markedBy: req.user.sub,
            },
          },
          { upsert: true, setDefaultsOnInsert: true }
        )
      )
    );

    // A day someone already submitted a work update for might now be approved
    // leave (e.g. the request was filed and approved after the fact) — clear
    // those updates so the day doesn't show both "on leave" and "worked".
    if (workingDates.length > 0) {
      await DailyWorkUpdate.deleteMany({ user: leaveRequest.user, date: { $in: workingDates } });
    }
  }

  const range =
    fmtDay(leaveRequest.fromDate) === fmtDay(leaveRequest.toDate)
      ? fmtDay(leaveRequest.fromDate)
      : `${fmtDay(leaveRequest.fromDate)} – ${fmtDay(leaveRequest.toDate)}`;
  await notify(
    leaveRequest.user,
    "leave_status",
    `Your leave request (${range}) was ${status.toLowerCase()}.`
  );

  res.json({ leaveRequest });
}

export async function getLeaveBalanceForUser(req, res) {
  const year = Number(req.query.year) || currentYear();

  let userId = req.user.sub;
  if (REVIEWER_ROLES.includes(req.user.role) && req.query.userId) {
    userId = req.query.userId;
  }

  const balance = await getLeaveBalance(userId, year);
  res.json({ ...balance, year });
}

export async function listLeaveBalances(req, res) {
  const year = Number(req.query.year) || currentYear();

  const users = await User.find({ isActive: true }).sort({ employeeId: 1 });

  const balances = await Promise.all(
    users.map(async (user) => {
      const balance = await getLeaveBalance(user._id, year);
      return {
        user: { id: user._id, employeeId: user.employeeId, name: user.name, role: user.role },
        ...balance,
      };
    })
  );

  res.json({ balances, year });
}
