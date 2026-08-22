import mongoose from "mongoose";

export const ROLE_NAMES = [
  "Developer_E",
  "Cyber Security_E",
  "Social Media & Performance Marketing_E",
  "Accounts_E",
  "Admin",
  "Management",
];

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, enum: ROLE_NAMES },
  description: { type: String },
});

export default mongoose.models.Role || mongoose.model("Role", roleSchema);
