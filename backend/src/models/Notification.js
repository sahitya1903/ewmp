import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["leave_status", "salary_credited", "announcement", "meeting", "follow_up"],
      required: true,
    },
    message: { type: String, required: true },
    // Optional external URL (e.g. a meeting link) the notification points to.
    link: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
