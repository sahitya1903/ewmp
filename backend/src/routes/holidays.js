import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { listHolidays, createHoliday, deleteHoliday } from "../controllers/holidayController.js";

const router = Router();

router.use(authGuard);

router.get("/", listHolidays);
// Marking holidays is common to Admin and HR (Management).
router.post("/", roleGuard("Admin", "Management"), createHoliday);
router.delete("/:id", roleGuard("Admin", "Management"), deleteHoliday);

export default router;
