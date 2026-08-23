import { Router } from "express";
import { login, me, logout } from "../controllers/authController.js";
import { authGuard } from "../middleware/authGuard.js";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authGuard, me);

export default router;