import { Router } from "express";
import { authGuard, moduleGuard, managementRoleGuard, managementCapabilityGuard } from "../middleware/authGuard.js";
import {
  applyLeave,
  listLeaveRequests,
  reviewLeaveRequest,
  getLeaveBalanceForUser,
  listLeaveBalances,
} from "../controllers/leaveController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);
router.use(moduleGuard("leave"));

router.post("/", h(applyLeave));
// managementCapabilityGuard is a no-op for anyone but a management role, so
// an employee's own GET/POST here is unaffected by the "leaveRequests" capability.
router.get("/", managementCapabilityGuard("leaveRequests"), h(listLeaveRequests));
router.get("/balance", h(getLeaveBalanceForUser));
// Any management role can see balances (read-only) to cross-check payroll
// deductions. Not gated by "leaveRequests" — the Employees/Interns tabs'
// balance column shares this same endpoint, independent of that capability.
router.get("/balances", managementRoleGuard(), h(listLeaveBalances));
router.patch("/:id/status", managementRoleGuard(), managementCapabilityGuard("leaveRequests"), h(reviewLeaveRequest));

export default router;
