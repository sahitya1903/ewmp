import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/authGuard.js";
import { listNotices, createNotice, updateNotice, deleteNotice } from "../controllers/noticeController.js";
import { asyncHandler as h } from "../lib/asyncHandler.js";

const router = Router();

router.use(authGuard);

// Every authenticated employee can read notices; only Admin posts, edits, or removes them.
router.get("/", h(listNotices));
router.post("/", roleGuard("Admin"), h(createNotice));
router.patch("/:id", roleGuard("Admin"), h(updateNotice));
router.delete("/:id", roleGuard("Admin"), h(deleteNotice));

export default router;
