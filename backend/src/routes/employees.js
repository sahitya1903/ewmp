import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";
import { REVIEWER_ROLES } from "../lib/roles.js";

const router = Router();

router.use(authGuard);

// Adding/editing/removing employees is common to Admin and HR (Management).
router.get("/", roleGuard(...REVIEWER_ROLES), listEmployees);
router.post("/", roleGuard(...REVIEWER_ROLES), createEmployee);
router.put("/:id", roleGuard(...REVIEWER_ROLES), updateEmployee);
router.delete("/:id", roleGuard(...REVIEWER_ROLES), deleteEmployee);

export default router;
