import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    // No enum here — valid roles are the built-in ROLE_NAMES plus any custom
    // role added at runtime (see CustomRole); validated in employeeController.
    role: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
