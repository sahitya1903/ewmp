import LeaveRequest from "../models/LeaveRequest.js";
import Attendance from "../models/Attendance.js";

function toDateOnly(value) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function eachDate(from, to) {
  const dates = [];
  const cursor = toDateOnly(from);
  const end = toDateOnly(to);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export async function applyLeave(req, res) {
  const { fromDate, toDate, reason } = req.body;

  if (!fromDate || !toDate || !reason) {
    return res.status(400).json({ error: "fromDate, toDate, and reason are required" });
  }

  const from = toDateOnly(fromDate);
  const to = toDateOnly(toDate);

  if (from > to) {
    return res.status(400).json({ error: "fromDate must be on or before toDate" });
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
  const isReviewer = ["Admin", "Management"].includes(req.user.role);
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
    const dates = eachDate(leaveRequest.fromDate, leaveRequest.toDate);
    await Promise.all(
      dates.map((date) =>
        Attendance.findOneAndUpdate(
          { user: leaveRequest.user, date },
          { $set: { status: "Leave", leaveRequest: leaveRequest._id, markedBy: req.user.sub } },
          { upsert: true, setDefaultsOnInsert: true }
        )
      )
    );
  }

  res.json({ leaveRequest });
}
