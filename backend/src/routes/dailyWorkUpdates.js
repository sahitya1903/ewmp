import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import {
  submitUpdate,
  getTodayUpdate,
  listTodayStatus,
  requestFollowUp,
} from "../controllers/dailyWorkUpdateController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

router.post("/", h(submitUpdate));
router.get("/today", h(getTodayUpdate));
router.get("/today-status", roleGuard("Admin", "Management"), h(listTodayStatus));
router.post("/:id/follow-up", roleGuard("Admin", "Management"), h(requestFollowUp));

export default router;
