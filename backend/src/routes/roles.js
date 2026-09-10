import { Router } from "express";
import { authGuard, managementRoleGuard, managementCapabilityGuard } from "../middleware/authGuard.js";
import { listRoles, createRole, deleteRole } from "../controllers/roleController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

router.get("/", h(listRoles));
router.post("/", managementRoleGuard(), managementCapabilityGuard("manageRoles"), h(createRole));
router.delete("/:name", managementRoleGuard(), managementCapabilityGuard("manageRoles"), h(deleteRole));

export default router;
