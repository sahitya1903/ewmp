import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    presentDays: { type: Number, required: true },
    leaveDays: { type: Number, required: true },
    paidLeaveDays: { type: Number, required: true, default: 0 },
    unpaidLeaveDays: { type: Number, required: true, default: 0 },
    absentDays: { type: Number, required: true },
    monthlySalary: { type: Number, required: true },
    dailySalary: { type: Number, required: true },
    salaryPayable: { type: Number, required: true },
  },
  { timestamps: true }
);

salarySchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Salary || mongoose.model("Salary", salarySchema);
