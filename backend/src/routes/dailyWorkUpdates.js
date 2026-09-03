import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import {
  submitUpdate,
  getTodayUpdate,
  listUpdates,
  listTodayStatus,
  listMyFollowUps,
  requestFollowUp,
  respondToFollowUp,
} from "../controllers/dailyWorkUpdateController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

router.post("/", h(submitUpdate));
router.get("/", h(listUpdates));
router.get("/today", h(getTodayUpdate));
router.get("/today-status", roleGuard("Admin", "Management"), h(listTodayStatus));
router.get("/follow-ups", h(listMyFollowUps));
router.post("/:id/follow-up", roleGuard("Admin", "Management"), h(requestFollowUp));
router.post("/:id/follow-up-response", h(respondToFollowUp));

export default router;
