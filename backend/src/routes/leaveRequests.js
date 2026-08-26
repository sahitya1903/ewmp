import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import {
  applyLeave,
  listLeaveRequests,
  reviewLeaveRequest,
  getLeaveBalanceForUser,
  listLeaveBalances,
} from "../controllers/leaveController.js";

const router = Router();

router.use(authGuard);

router.post("/", applyLeave);
router.get("/", listLeaveRequests);
router.get("/balance", getLeaveBalanceForUser);
router.get("/balances", roleGuard("Admin", "Management"), listLeaveBalances);
router.patch("/:id/status", roleGuard("Admin", "Management"), reviewLeaveRequest);

export default router;
