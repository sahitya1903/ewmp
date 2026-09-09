import { Router } from "express";
import { authGuard, roleGuard, moduleGuard } from "../middleware/authGuard.js";
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
router.get("/", h(listLeaveRequests));
router.get("/balance", h(getLeaveBalanceForUser));
// Accounts can see balances too (read-only) to cross-check payroll deductions.
router.get("/balances", roleGuard(...REVIEWER_ROLES, "Accounts_E"), h(listLeaveBalances));
router.patch("/:id/status", roleGuard(...REVIEWER_ROLES), h(reviewLeaveRequest));

export default router;
