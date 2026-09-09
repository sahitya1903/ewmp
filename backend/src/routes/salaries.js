import { Router } from "express";
import { authGuard, roleGuard, moduleGuard, hrCapabilityGuard } from "../middleware/authGuard.js";
import { listSalaries, listSalaryHistory, updateCredited } from "../controllers/salaryController.js";
import { REVIEWER_ROLES } from "../lib/roles.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);
router.use(moduleGuard("salary"));

router.get("/", hrCapabilityGuard("salaries"), h(listSalaries));
// Viewing and recording salary payments is common to Admin, HR, and Accounts.
router.get("/history", roleGuard(...REVIEWER_ROLES, "Accounts_E"), hrCapabilityGuard("salaryHistory"), h(listSalaryHistory));
router.patch("/:id/credit", roleGuard(...REVIEWER_ROLES, "Accounts_E"), hrCapabilityGuard("salaries"), h(updateCredited));

export default router;
