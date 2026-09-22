import mongoose from "mongoose";

// A follow-up thread on a work update: a reviewer's "request" and the
// employee's "response", kept in order — nothing is overwritten.
const followUpEntrySchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["request", "response"], required: true },
    text: { type: String, trim: true, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const dailyWorkUpdateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    // Each day gets two entries: a "start" (today's task / blocker / end goal)
    // and an "end" (today's task / blocker / progress) — see the controller
    // for the per-slot required-field rules and submission order.
    slot: { type: String, enum: ["start", "end"], required: true },
    todaysTask: { type: String, required: true },
    blocker: { type: String, required: true },
    endGoal: { type: String },
    progress: { type: String },
    followUps: { type: [followUpEntrySchema], default: [] },
    // Set when a reviewer ends the follow-up conversation; cleared if a reviewer
    // opens a new request on the same update.
    followUpClosedAt: { type: Date },
    followUpClosedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

dailyWorkUpdateSchema.index({ user: 1, date: 1, slot: 1 }, { unique: true });

export default mongoose.models.DailyWorkUpdate || mongoose.model("DailyWorkUpdate", dailyWorkUpdateSchema);
