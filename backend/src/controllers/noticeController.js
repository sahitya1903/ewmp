import Notice from "../models/Notice.js";
import User from "../models/User.js";
import { isValidDate } from "../lib/dates.js";
import { notifyMany } from "../lib/notify.js";

async function fanOutNotice(notice, exceptUserId, verb) {
  const recipients = await User.find({ isActive: true, _id: { $ne: exceptUserId } }, "_id");
  await notifyMany(
    recipients.map((u) => u._id),
    "announcement",
    `${verb}: ${notice.title}`,
    notice.link
  );
}

export async function listNotices(req, res) {
  const filter = {};

  if (req.query.year) {
    const year = Number(req.query.year);
    filter.date = {
      $gte: new Date(Date.UTC(year, 0, 1)),
      $lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }

  const notices = await Notice.find(filter).populate("createdBy", "name").sort({ date: -1 });
  res.json({ notices });
}

export async function createNotice(req, res) {
  const { title, body, link, date } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: "title and date are required" });
  }
  if (link && !/^https?:\/\//i.test(link.trim())) {
    return res.status(400).json({ error: "link must start with http:// or https://" });
  }

  if (!isValidDate(date)) {
    return res.status(400).json({ error: "date is invalid" });
  }
  const day = new Date(date);

  const notice = await Notice.create({
    title: title.trim(),
    body: body?.trim() || undefined,
    link: link?.trim() || undefined,
    date: day,
    createdBy: req.user.sub,
  });

  await fanOutNotice(notice, req.user.sub, "New notice");

  res.status(201).json({ notice: await notice.populate("createdBy", "name") });
}

export async function updateNotice(req, res) {
  const { id } = req.params;
  const { title, body, link, date } = req.body;

  const notice = await Notice.findById(id);
  if (!notice) return res.status(404).json({ error: "Notice not found" });

  if (title !== undefined) {
    if (!title.trim()) return res.status(400).json({ error: "title cannot be empty" });
    notice.title = title.trim();
  }
  if (date !== undefined) {
    if (!isValidDate(date)) return res.status(400).json({ error: "date is invalid" });
    notice.date = new Date(date);
  }
  if (link !== undefined) {
    const trimmed = link?.trim() || "";
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      return res.status(400).json({ error: "link must start with http:// or https://" });
    }
    notice.link = trimmed || undefined;
  }
  if (body !== undefined) {
    notice.body = body?.trim() || undefined;
  }

  await notice.save();
  await fanOutNotice(notice, req.user.sub, "Notice updated");
  res.json({ notice: await notice.populate("createdBy", "name") });
}

export async function deleteNotice(req, res) {
  const { id } = req.params;
  const notice = await Notice.findById(id);
  if (!notice) return res.status(404).json({ error: "Notice not found" });
  await notice.deleteOne();
  res.json({ ok: true });
}
