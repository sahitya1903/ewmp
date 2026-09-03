import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { markAttendance, listAttendance } from "../controllers/attendanceController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

router.get("/", h(listAttendance));
router.post("/mark", roleGuard("Admin"), h(markAttendance));

export default router;
