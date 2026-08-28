import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { listRoles, createRole } from "../controllers/roleController.js";
import { REVIEWER_ROLES } from "../lib/roles.js";

const router = Router();

router.use(authGuard);

router.get("/", listRoles);
router.post("/", roleGuard(...REVIEWER_ROLES), createRole);

export default router;
