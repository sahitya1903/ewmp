import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";

const router = Router();

router.use(authGuard, roleGuard("Management"));

router.get("/", listEmployees);
router.post("/", createEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;
