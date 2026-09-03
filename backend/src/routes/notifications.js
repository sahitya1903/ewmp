import { Router } from "express";
import { authGuard } from "../middleware/authGuard.js";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

// Everyone reads and manages only their own notifications.
router.get("/", h(listNotifications));
router.post("/read-all", h(markAllNotificationsRead));
router.patch("/:id/read", h(markNotificationRead));

export default router;
