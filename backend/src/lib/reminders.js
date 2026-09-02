import Notice from "../models/Notice.js";
import Notification from "../models/Notification.js";
import { startOfDay } from "./dates.js";
import { notify } from "./notify.js";

// There's no background scheduler, so meeting/notice reminders are generated
// lazily: whenever someone fetches their notifications, we check for notices
// landing today or tomorrow and drop in a one-time reminder they don't already
// have. Cheap in the common case — the notice lookup is usually empty.
export async function generateDueReminders(userId) {
  const today = startOfDay();
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setUTCDate(dayAfterTomorrow.getUTCDate() + 2);

  const upcoming = await Notice.find({ date: { $gte: today, $lt: dayAfterTomorrow } });
  if (upcoming.length === 0) return;

  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  for (const notice of upcoming) {
    const when = notice.date < tomorrow ? "today" : "tomorrow";
    const message = `Reminder: "${notice.title}" is ${when}.`;

    if (await Notification.exists({ user: userId, type: "meeting", message })) continue;
    await notify(userId, "meeting", message, notice.link);
  }
}
