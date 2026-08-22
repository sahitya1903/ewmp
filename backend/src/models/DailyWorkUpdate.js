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
  },
  { timestamps: true }
);

dailyWorkUpdateSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyWorkUpdate || mongoose.model("DailyWorkUpdate", dailyWorkUpdateSchema);
