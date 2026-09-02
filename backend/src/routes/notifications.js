import { Router } from "express";
import { authGuard } from "../middleware/authGuard.js";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationController.js";

const router = Router();

router.use(authGuard);

// Everyone reads and manages only their own notifications.
router.get("/", listNotifications);
router.post("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

export default router;
