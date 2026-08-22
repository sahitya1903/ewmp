import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Holiday || mongoose.model("Holiday", holidaySchema);
