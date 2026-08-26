import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as c from "../controllers/stickers/sticker.controller";
const router=express.Router();
router.get("/packs", authMiddleware, c.getStickerPacks);
router.get("/packs/:packId", authMiddleware, c.getStickerPackById);
export default router;
