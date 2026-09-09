import { Router } from "express";
import { authGuard, roleGuard, hrCapabilityGuard } from "../middleware/authGuard.js";
import { listRoles, createRole } from "../controllers/roleController.js";
import { REVIEWER_ROLES } from "../lib/roles.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

router.get("/", h(listRoles));
router.post("/", roleGuard(...REVIEWER_ROLES), hrCapabilityGuard("manageRoles"), h(createRole));

export default router;
