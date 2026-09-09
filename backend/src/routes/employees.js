import { Router } from "express";
import { authGuard, roleGuard, hrCapabilityGuard } from "../middleware/authGuard.js";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";
import { REVIEWER_ROLES } from "../lib/roles.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

// Adding/editing/removing employees is common to Admin and HR, gated for HR
// by the "employees" capability. The directory itself (GET) stays available
// to both — it's shared lookup data used by other HR tabs (Overview, Work
// Updates) regardless of that capability.
router.get("/", roleGuard(...REVIEWER_ROLES), h(listEmployees));
router.post("/", roleGuard(...REVIEWER_ROLES), hrCapabilityGuard("employees"), h(createEmployee));
router.put("/:id", roleGuard(...REVIEWER_ROLES), hrCapabilityGuard("employees"), h(updateEmployee));
router.delete("/:id", roleGuard(...REVIEWER_ROLES), hrCapabilityGuard("employees"), h(deleteEmployee));

export default router;
