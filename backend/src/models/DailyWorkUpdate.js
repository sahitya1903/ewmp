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
    currentProject: { type: String, required: true },
    todaysProgress: { type: String, required: true },
    remainingWork: { type: String },
    estimatedCompletion: { type: Date },
    additionalWork: { type: String },
    followUps: { type: [followUpEntrySchema], default: [] },
    // Set when a reviewer ends the follow-up conversation; cleared if a reviewer
    // opens a new request on the same update.
    followUpClosedAt: { type: Date },
    followUpClosedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

dailyWorkUpdateSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyWorkUpdate || mongoose.model("DailyWorkUpdate", dailyWorkUpdateSchema);
