import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { listHolidays, createHoliday, deleteHoliday } from "../controllers/holidayController.js";

const router = Router();

router.use(authGuard);

router.get("/", listHolidays);
router.post("/", roleGuard("Admin"), createHoliday);
router.delete("/:id", roleGuard("Admin"), deleteHoliday);

export default router;
