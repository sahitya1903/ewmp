import mongoose from "mongoose";

// One entry per credit action — the first credit, and every later edit/revision.
const historyEntrySchema = new mongoose.Schema(
  {
    action: { type: String, enum: ["credited", "revised", "uncredited"], required: true },
    amount: { type: Number },
    remark: { type: String, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const salaryPaymentSchema = new mongoose.Schema(
  {
    salary: { type: mongoose.Schema.Types.ObjectId, ref: "Salary", required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    credited: { type: Boolean, default: false },
    creditedDate: { type: Date },
    creditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amountCredited: { type: Number },
    remark: { type: String, trim: true },
    // Set only when a payment already marked credited gets edited (e.g. to fix a
    // wrong amount) — creditedBy/creditedDate keep pointing at who first credited
    // it, these point at who last revised it.
    revisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    revisedDate: { type: Date },
    history: { type: [historyEntrySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.SalaryPayment || mongoose.model("SalaryPayment", salaryPaymentSchema);
