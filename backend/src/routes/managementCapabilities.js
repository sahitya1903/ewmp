import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { listCapabilities, updateCapabilities, getMyCapabilities } from "../controllers/managementCapabilityController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

router.get("/mine", h(getMyCapabilities));
// Only Admin configures which console capabilities HR/Accounts retain.
router.get("/", roleGuard("Admin"), h(listCapabilities));
router.put("/:role", roleGuard("Admin"), h(updateCapabilities));

export default router;
