import { Router } from "express";
import {
  login,
  me,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { authGuard } from "../middleware/authGuard.js";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authGuard, me);
router.post("/change-password", authGuard, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
