import { Router } from "express";
import { authGuard, roleGuard, moduleGuard, hrCapabilityGuard } from "../middleware/authGuard.js";
import {
  applyLeave,
  listLeaveRequests,
  reviewLeaveRequest,
  getLeaveBalanceForUser,
  listLeaveBalances,
} from "../controllers/leaveController.js";
import { REVIEWER_ROLES } from "../lib/roles.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);
router.use(moduleGuard("leave"));

router.post("/", h(applyLeave));
// hrCapabilityGuard is a no-op for anyone but HR, so an employee's own
// GET/POST here is unaffected by the "leaveRequests" capability.
router.get("/", hrCapabilityGuard("leaveRequests"), h(listLeaveRequests));
router.get("/balance", h(getLeaveBalanceForUser));
// Accounts can see balances too (read-only) to cross-check payroll deductions.
// Not gated by "leaveRequests" — the Employees/Interns tabs' balance column
// shares this same endpoint for HR, independent of that capability.
router.get("/balances", roleGuard(...REVIEWER_ROLES, "Accounts_E"), h(listLeaveBalances));
router.patch("/:id/status", roleGuard(...REVIEWER_ROLES), hrCapabilityGuard("leaveRequests"), h(reviewLeaveRequest));

export default router;
