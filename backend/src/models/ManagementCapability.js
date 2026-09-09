import mongoose from "mongoose";
import { MANAGEMENT_CAPABILITY_KEYS } from "../lib/managementCapabilities.js";

// One document per management role (HR or Accounts_E) holding which console
// capabilities Admin has granted it. A role with no document yet falls back
// to DEFAULT_MANAGEMENT_CAPABILITIES (see lib/managementAccess.js).
const managementCapabilitySchema = new mongoose.Schema(
  {
    role: { type: String, required: true, unique: true, trim: true },
    enabledCapabilities: {
      type: [{ type: String, enum: MANAGEMENT_CAPABILITY_KEYS }],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.ManagementCapability || mongoose.model("ManagementCapability", managementCapabilitySchema);
