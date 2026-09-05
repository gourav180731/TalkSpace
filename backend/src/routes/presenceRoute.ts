import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { getPresence, getUserPresence } from "../controllers/presence/presence.controller";
const router = express.Router();
router.get("/", authMiddleware, getPresence);
router.get("/:userId", authMiddleware, getUserPresence);
export default router;
