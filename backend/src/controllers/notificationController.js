import Notification from "../models/Notification.js";
import { generateDueReminders } from "../lib/reminders.js";

export async function listNotifications(req, res) {
  // Lazily materialise any meeting/notice reminders that have come due.
  await generateDueReminders(req.user.sub).catch((err) =>
    console.error("reminder generation failed:", err.message)
  );

  const notifications = await Notification.find({ user: req.user.sub })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({ user: req.user.sub, isRead: false });
  res.json({ notifications, unreadCount });
}

export async function markNotificationRead(req, res) {
  await Notification.updateOne(
    { _id: req.params.id, user: req.user.sub },
    { $set: { isRead: true } }
  );
  res.json({ ok: true });
}

export async function markAllNotificationsRead(req, res) {
  await Notification.updateMany(
    { user: req.user.sub, isRead: false },
    { $set: { isRead: true } }
  );
  res.json({ ok: true });
}
