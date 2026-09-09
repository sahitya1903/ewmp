import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { listPermissions, updatePermissions, getMyPermissions } from "../controllers/rolePermissionController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

router.get("/mine", h(getMyPermissions));
// Only Admin configures per-role feature access.
router.get("/", roleGuard("Admin"), h(listPermissions));
router.put("/:role", roleGuard("Admin"), h(updatePermissions));

export default router;
