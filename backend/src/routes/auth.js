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
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.post("/login", h(login));
router.post("/logout", h(logout));
router.get("/me", authGuard, h(me));
router.post("/change-password", authGuard, h(changePassword));
router.post("/forgot-password", h(forgotPassword));
router.post("/reset-password", h(resetPassword));

export default router;
