import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import {
  submitUpdate,
  getTodayUpdate,
  listTodayStatus,
  requestFollowUp,
} from "../controllers/dailyWorkUpdateController.js";

const router = Router();

router.use(authGuard);

router.post("/", submitUpdate);
router.get("/today", getTodayUpdate);
router.get("/today-status", roleGuard("Admin", "Management"), listTodayStatus);
router.post("/:id/follow-up", roleGuard("Admin", "Management"), requestFollowUp);

export default router;
