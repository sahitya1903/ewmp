import mongoose from "mongoose";

// Roles added at runtime by Admin/HR/Accounts, beyond the built-in
// ROLE_NAMES. `category` is a category name (built-in "management" /
// "employee" or a custom one); its base type determines the default landing
// page and which Access Control section applies — an "employee" base type
// uses /dashboard and the per-module permissions table, a "management" base
// type gets a console (see lib/roleSlug.js for the URL) and the
// management-capabilities panel. Validated against known categories in
// roleController, so no enum here.
const customRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, default: "employee", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.CustomRole || mongoose.model("CustomRole", customRoleSchema);
