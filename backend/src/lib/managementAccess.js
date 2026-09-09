import ManagementCapability from "../models/ManagementCapability.js";
import { DEFAULT_MANAGEMENT_CAPABILITIES } from "./managementCapabilities.js";

export async function getEnabledManagementCapabilities(role) {
  const doc = await ManagementCapability.findOne({ role });
  if (doc) return doc.enabledCapabilities;
  // HR/Accounts default to what they always had; any other management role
  // (a brand-new custom one) starts with nothing until Admin grants something.
  return DEFAULT_MANAGEMENT_CAPABILITIES[role] ?? [];
}

export async function managementCanUse(role, capabilityKey) {
  const enabled = await getEnabledManagementCapabilities(role);
  return enabled.includes(capabilityKey);
}
