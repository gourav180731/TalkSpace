import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { contactSyncLimiter } from "../middlewares/rateLimiter";
import * as c from "../controllers/contacts/contact.controller";
const router=express.Router();
router.post("/sync", authMiddleware, contactSyncLimiter, c.syncContacts);
export default router;
