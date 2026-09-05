import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as c from "../controllers/calls/callHistory.controller";
const router=express.Router();
router.get("/", authMiddleware, c.getGlobalHistory);
router.get("/chat/:userId", authMiddleware, c.getChatHistory);
router.delete("/:id", authMiddleware, c.deleteSingle);
router.delete("/", authMiddleware, c.deleteAll);
export default router;
