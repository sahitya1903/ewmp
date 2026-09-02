import Notification from "../models/Notification.js";

// Fire-and-forget notification helpers. A notification is a side effect of some
// primary action (a leave review, a salary credit, a new notice) — if writing
// it fails, log and move on rather than failing the request that triggered it.

export async function notify(userId, type, message, link) {
  try {
    await Notification.create({ user: userId, type, message, link: link || undefined });
  } catch (err) {
    console.error("notify failed:", err.message);
  }
}

export async function notifyMany(userIds, type, message, link) {
  const ids = userIds.filter(Boolean);
  if (ids.length === 0) return;
  try {
    await Notification.insertMany(
      ids.map((user) => ({ user, type, message, link: link || undefined }))
    );
  } catch (err) {
    console.error("notifyMany failed:", err.message);
  }
}
