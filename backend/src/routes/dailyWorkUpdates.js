import { Router } from "express";
import { authGuard, roleGuard, moduleGuard, hrCapabilityGuard } from "../middleware/authGuard.js";
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
// For HR, the bare list is exclusively the Work Updates tab's all-employee
// view — gated by that capability; a no-op for anyone calling it for themselves.
router.get("/", hrCapabilityGuard("workUpdates"), h(listUpdates));
router.get("/today", h(getTodayUpdate));
router.get("/today-status", roleGuard("Admin", "HR"), hrCapabilityGuard("workUpdates"), h(listTodayStatus));
router.get("/follow-ups", h(listMyFollowUps));
router.post("/:id/follow-up", roleGuard("Admin", "HR"), hrCapabilityGuard("workUpdates"), h(requestFollowUp));
router.post("/:id/follow-up-response", h(respondToFollowUp));
router.post("/:id/follow-up-close", roleGuard("Admin", "HR"), hrCapabilityGuard("workUpdates"), h(closeFollowUp));

export default router;
