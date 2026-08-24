import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { applyLeave, listLeaveRequests, reviewLeaveRequest } from "../controllers/leaveController.js";

const router = Router();

router.use(authGuard);

router.post("/", applyLeave);
router.get("/", listLeaveRequests);
router.patch("/:id/status", roleGuard("Admin", "Management"), reviewLeaveRequest);

export default router;
