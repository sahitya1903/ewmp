import mongoose from "mongoose";
import { BASE_TYPES } from "../lib/categories.js";

// Categories added at runtime by Admin (or a management role with the
// "manageRoles" capability), beyond the two built-ins ("management" /
// "employee", which live as constants in lib/categories.js, not here). Each
// carries a base type that decides how its roles behave — see
// lib/roleCategory.js.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    baseType: { type: String, enum: BASE_TYPES, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.models.Category || mongoose.model("Category", categorySchema);
