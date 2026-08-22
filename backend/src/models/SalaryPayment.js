import mongoose from "mongoose";

const salaryPaymentSchema = new mongoose.Schema(
  {
    salary: { type: mongoose.Schema.Types.ObjectId, ref: "Salary", required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    credited: { type: Boolean, default: false },
    creditedDate: { type: Date },
    creditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.SalaryPayment || mongoose.model("SalaryPayment", salaryPaymentSchema);
