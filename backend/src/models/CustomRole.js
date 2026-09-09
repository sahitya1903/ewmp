import mongoose from "mongoose";

// Roles added at runtime by Admin/HR/Accounts, beyond the built-in
// ROLE_NAMES. Category determines the default landing page and which
// Access Control section applies: "employee" roles use /dashboard and the
// per-module permissions table; "management" roles get a console (see
// lib/roleSlug.js for the URL) and the management-capabilities panel.
const customRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: { type: String, enum: ["management", "employee"], required: true, default: "employee" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.CustomRole || mongoose.model("CustomRole", customRoleSchema);
