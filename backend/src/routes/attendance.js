import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { markAttendance, listAttendance } from "../controllers/attendanceController.js";

const router = Router();

router.use(authGuard);

router.get("/", listAttendance);
router.post("/mark", roleGuard("Admin"), markAttendance);

export default router;
