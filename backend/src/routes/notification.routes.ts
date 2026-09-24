import { Router } from "express";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, getMyNotifications);

router.patch("/read-all", authenticate, markAllNotificationsRead);

router.patch("/:id/read", authenticate, markNotificationRead);

export default router;