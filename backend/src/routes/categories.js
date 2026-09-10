import { Router } from "express";
import { authGuard, managementRoleGuard, managementCapabilityGuard } from "../middleware/authGuard.js";
import { listCategoriesHandler, createCategory, deleteCategory } from "../controllers/categoryController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

// Any authenticated user can read the list — the Add-role form needs it.
router.get("/", h(listCategoriesHandler));
// Adding / removing categories is gated exactly like adding a custom role.
router.post("/", managementRoleGuard(), managementCapabilityGuard("manageRoles"), h(createCategory));
router.delete("/:name", managementRoleGuard(), managementCapabilityGuard("manageRoles"), h(deleteCategory));

export default router;
