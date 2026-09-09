import { Router } from "express";
import { authGuard, moduleGuard, managementRoleGuard, managementCapabilityGuard } from "../middleware/authGuard.js";
import { listSalaries, listSalaryHistory, updateCredited } from "../controllers/salaryController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);
router.use(moduleGuard("salary"));

router.get("/", managementCapabilityGuard("salaries"), h(listSalaries));
// Viewing and recording salary payments is common to every management role.
router.get("/history", managementRoleGuard(), managementCapabilityGuard("salaryHistory"), h(listSalaryHistory));
router.patch("/:id/credit", managementRoleGuard(), managementCapabilityGuard("salaries"), h(updateCredited));

export default router;
