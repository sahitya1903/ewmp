import mongoose from "mongoose";
import { HR_CAPABILITY_KEYS } from "../lib/hrCapabilities.js";

// A single document (key: "hr") holding which console capabilities Admin has
// granted to the HR role. No document yet = HR has all of them, so nothing
// changes until Admin restricts something from the Access Control panel.
const hrCapabilitySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "hr" },
    enabledCapabilities: {
      type: [{ type: String, enum: HR_CAPABILITY_KEYS }],
      default: () => [...HR_CAPABILITY_KEYS],
    },
  },
  { timestamps: true }
);

export default mongoose.models.HrCapability || mongoose.model("HrCapability", hrCapabilitySchema);
