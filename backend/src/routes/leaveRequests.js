import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import {
  applyLeave,
  listLeaveRequests,
  reviewLeaveRequest,
  getLeaveBalanceForUser,
  listLeaveBalances,
} from "../controllers/leaveController.js";
import { REVIEWER_ROLES } from "../lib/roles.js";

const router = Router();

router.use(authGuard);

router.post("/", applyLeave);
router.get("/", listLeaveRequests);
router.get("/balance", getLeaveBalanceForUser);
// Accounts can see balances too (read-only) to cross-check payroll deductions.
router.get("/balances", roleGuard(...REVIEWER_ROLES, "Accounts_E"), listLeaveBalances);
router.patch("/:id/status", roleGuard(...REVIEWER_ROLES), reviewLeaveRequest);

export default router;
