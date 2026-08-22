import mongoose from "mongoose";

const employeeProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    phone: { type: String, required: true },
    monthlySalary: { type: Number, required: true },
    joiningDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.EmployeeProfile || mongoose.model("EmployeeProfile", employeeProfileSchema);
