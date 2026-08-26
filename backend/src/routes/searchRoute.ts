import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as c from "../controllers/search/search.controller";
import { searchLimiter } from "../middlewares/rateLimiter";
const router=express.Router();
router.get("/messages/:chatId", authMiddleware, searchLimiter, c.searchMessages);
router.get("/messages/group/:groupId", authMiddleware, searchLimiter, c.searchGroupMessages);
export default router;
