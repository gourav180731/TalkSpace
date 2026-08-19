import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/messages/notification.controller";

const router = express.Router();

router.get("/", authMiddleware, getMyNotifications);
router.post("/read/:id", authMiddleware, markNotificationRead);
router.post("/read-all", authMiddleware, markAllNotificationsRead);

export default router;
