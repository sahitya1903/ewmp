import Notice from "../models/Notice.js";
import Notification from "../models/Notification.js";

// There's no background scheduler, so meeting/notice reminders are generated
// lazily: whenever someone fetches their notifications, we check for notices
// landing today or tomorrow and drop in a one-time reminder they don't already
// have. Cheap in the common case — the notice lookup is usually empty.
export async function generateDueReminders(userId) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(startOfToday);
  endOfTomorrow.setUTCDate(endOfTomorrow.getUTCDate() + 2);

  const upcoming = await Notice.find({ date: { $gte: startOfToday, $lt: endOfTomorrow } });
  if (upcoming.length === 0) return;

  const dayAfterToday = new Date(startOfToday);
  dayAfterToday.setUTCDate(dayAfterToday.getUTCDate() + 1);

  for (const notice of upcoming) {
    const when = notice.date < dayAfterToday ? "today" : "tomorrow";
    const message = `Reminder: "${notice.title}" is ${when}.`;

    const already = await Notification.exists({ user: userId, type: "meeting", message });
    if (already) continue;

    await Notification.create({
      user: userId,
      type: "meeting",
      message,
      link: notice.link || undefined,
    });
  }
}
