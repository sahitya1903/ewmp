import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { listSalaries, updateCredited } from "../controllers/salaryController.js";

const router = Router();

router.use(authGuard);

router.get("/", listSalaries);
router.patch("/:id/credit", roleGuard("Accounts_E"), updateCredited);

export default router;
