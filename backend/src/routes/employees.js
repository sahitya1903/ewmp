import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";

const router = Router();

router.use(authGuard);

// Admin needs read access to pick an employee when marking attendance;
// create/update/delete stay Management-only.
router.get("/", roleGuard("Admin", "Management"), listEmployees);
router.post("/", roleGuard("Management"), createEmployee);
router.put("/:id", roleGuard("Management"), updateEmployee);
router.delete("/:id", roleGuard("Management"), deleteEmployee);

export default router;
