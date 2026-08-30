import mongoose from "mongoose";

// A notice or meeting announcement posted by an Admin. Visible to every
// employee, and — because it carries a date — shown on the calendar too.
const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },
    // Optional meeting link (Google Meet / Zoom / etc.).
    link: { type: String, trim: true },
    date: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Notice || mongoose.model("Notice", noticeSchema);
