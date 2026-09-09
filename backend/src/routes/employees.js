import { Router } from "express";
import { authGuard, managementRoleGuard, managementCapabilityGuard } from "../middleware/authGuard.js";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);
router.use(managementRoleGuard());

// Adding/editing/removing employees is common to every management role,
// gated by the "employees" capability. The directory itself (GET) is open
// to any management role regardless of that capability — a role needs it
// just to see who's who, and other tabs (Overview, Work Updates) reuse it
// as shared lookup data too.
router.get("/", h(listEmployees));
router.post("/", managementCapabilityGuard("employees"), h(createEmployee));
router.put("/:id", managementCapabilityGuard("employees"), h(updateEmployee));
router.delete("/:id", managementCapabilityGuard("employees"), h(deleteEmployee));

export default router;
