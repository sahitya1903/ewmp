import mongoose from "mongoose";

// Roles added at runtime by Admin/HR, beyond the built-in ROLE_NAMES.
const customRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.CustomRole || mongoose.model("CustomRole", customRoleSchema);
