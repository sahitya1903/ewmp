import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { listHolidays, createHoliday, deleteHoliday } from "../controllers/holidayController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

router.get("/", h(listHolidays));
// Marking holidays is common to Admin and HR.
router.post("/", roleGuard("Admin", "HR"), h(createHoliday));
router.delete("/:id", roleGuard("Admin", "HR"), h(deleteHoliday));

export default router;
