import Holiday from "../models/Holiday.js";

export async function listHolidays(req, res) {
  const filter = {};

  if (req.query.year) {
    const year = Number(req.query.year);
    filter.date = {
      $gte: new Date(Date.UTC(year, 0, 1)),
      $lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }

  const holidays = await Holiday.find(filter).sort({ date: 1 });
  res.json({ holidays });
}

export async function createHoliday(req, res) {
  const { date, name, description } = req.body;

  if (!date || !name) {
    return res.status(400).json({ error: "date and name are required" });
  }

  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);

  try {
    const holiday = await Holiday.create({ date: day, name, description });
    res.status(201).json({ holiday });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "A holiday already exists on that date" });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteHoliday(req, res) {
  const { id } = req.params;
  const holiday = await Holiday.findById(id);
  if (!holiday) return res.status(404).json({ error: "Holiday not found" });
  await holiday.deleteOne();
  res.json({ ok: true });
}
