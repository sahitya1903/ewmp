import { Router } from "express";
import { authGuard, roleGuard, moduleGuard, managementCapabilityGuard } from "../middleware/authGuard.js";
import { markAttendance, listAttendance } from "../controllers/attendanceController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);
router.use(moduleGuard("attendance"));

// For HR/Accounts, this route is exclusively the "Overview" tab's
// all-employee view — gated by that capability; a no-op for anyone else
// calling it for themselves.
router.get("/", managementCapabilityGuard("overview"), h(listAttendance));
router.post("/mark", roleGuard("Admin"), h(markAttendance));

export default router;
