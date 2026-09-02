import mongoose from "mongoose";

const dailyWorkUpdateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    currentProject: { type: String, required: true },
    todaysProgress: { type: String, required: true },
    remainingWork: { type: String },
    estimatedCompletion: { type: Date },
    additionalWork: { type: String },
    // A reviewer (Admin/Management) can ask the employee to follow up on an
    // update — the latest such request lives here and drives a notification.
    followUp: {
      note: { type: String, trim: true },
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: { type: Date },
    },
  },
  { timestamps: true }
);

dailyWorkUpdateSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyWorkUpdate || mongoose.model("DailyWorkUpdate", dailyWorkUpdateSchema);
