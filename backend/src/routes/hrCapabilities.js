import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { getCapabilities, updateCapabilities, getMyCapabilities } from "../controllers/hrCapabilityController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

router.get("/mine", h(getMyCapabilities));
// Only Admin configures which console capabilities HR retains.
router.get("/", roleGuard("Admin"), h(getCapabilities));
router.put("/", roleGuard("Admin"), h(updateCapabilities));

export default router;
