import HrCapability from "../models/HrCapability.js";
import { HR_CAPABILITIES, HR_CAPABILITY_KEYS } from "../lib/hrCapabilities.js";
import { getHrEnabledCapabilities } from "../lib/hrAccess.js";

export async function getCapabilities(req, res) {
  const enabledCapabilities = await getHrEnabledCapabilities();
  res.json({ capabilities: HR_CAPABILITIES, enabledCapabilities });
}

export async function updateCapabilities(req, res) {
  const { enabledCapabilities } = req.body;

  if (!Array.isArray(enabledCapabilities) || enabledCapabilities.some((c) => !HR_CAPABILITY_KEYS.includes(c))) {
    return res.status(400).json({ error: "enabledCapabilities must be a list of valid capability keys" });
  }

  const doc = await HrCapability.findOneAndUpdate(
    { key: "hr" },
    { enabledCapabilities },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  res.json({ enabledCapabilities: doc.enabledCapabilities });
}

export async function getMyCapabilities(req, res) {
  if (req.user.role !== "HR") {
    return res.json({ enabledCapabilities: HR_CAPABILITY_KEYS });
  }
  const enabledCapabilities = await getHrEnabledCapabilities();
  res.json({ enabledCapabilities });
}
