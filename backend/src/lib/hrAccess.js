import HrCapability from "../models/HrCapability.js";
import { HR_CAPABILITY_KEYS } from "./hrCapabilities.js";

export async function getHrEnabledCapabilities() {
  const doc = await HrCapability.findOne({ key: "hr" });
  return doc ? doc.enabledCapabilities : HR_CAPABILITY_KEYS;
}

export async function hrCanUse(capabilityKey) {
  const enabled = await getHrEnabledCapabilities();
  return enabled.includes(capabilityKey);
}
