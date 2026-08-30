import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { listNotices, createNotice, updateNotice, deleteNotice } from "../controllers/noticeController.js";

const router = Router();

router.use(authGuard);

// Every authenticated employee can read notices; only Admin posts, edits, or removes them.
router.get("/", listNotices);
router.post("/", roleGuard("Admin"), createNotice);
router.patch("/:id", roleGuard("Admin"), updateNotice);
router.delete("/:id", roleGuard("Admin"), deleteNotice);

export default router;
