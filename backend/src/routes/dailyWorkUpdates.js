import { Router } from "express";
import { authGuard, roleGuard, moduleGuard } from "../middleware/authGuard.js";
import {
  submitUpdate,
  getTodayUpdate,
  listUpdates,
  listTodayStatus,
  listMyFollowUps,
  requestFollowUp,
  respondToFollowUp,
  closeFollowUp,
} from "../controllers/dailyWorkUpdateController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);
router.use(moduleGuard("dailyWorkUpdate"));

router.post("/", h(submitUpdate));
router.get("/", h(listUpdates));
router.get("/today", h(getTodayUpdate));
router.get("/today-status", roleGuard("Admin", "HR"), h(listTodayStatus));
router.get("/follow-ups", h(listMyFollowUps));
router.post("/:id/follow-up", roleGuard("Admin", "HR"), h(requestFollowUp));
router.post("/:id/follow-up-response", h(respondToFollowUp));
router.post("/:id/follow-up-close", roleGuard("Admin", "HR"), h(closeFollowUp));

export default router;
