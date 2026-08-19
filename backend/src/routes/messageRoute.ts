import express from "express";
import {clearChat, getChatList,getMessages,getMyFriends,markMessagesAsRead,sendMessages,deleteMessageForEveryone, deleteMessageForMe, reactToMessage} from "../controllers/messages/chat.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { upload } from "../libs/multer";
import { chatPermissionMiddleware } from "../middlewares/chatPermission.middleware";
import { messageLimiter } from "../middlewares/rateLimiter";

const router = express.Router();

router.get("/chats", authMiddleware, getChatList);
router.get("/chat/:id", authMiddleware,chatPermissionMiddleware, getMessages);
router.post("/chat/read/:id", authMiddleware,chatPermissionMiddleware, markMessagesAsRead);
router.post("/send/:id",  messageLimiter,authMiddleware, chatPermissionMiddleware, upload.single("file"), sendMessages);
router.delete("/chat/:messageId", authMiddleware, chatPermissionMiddleware, clearChat);
router.delete("/:messageId", authMiddleware, deleteMessageForEveryone);
router.delete("/me/:messageId", authMiddleware, deleteMessageForMe)
router.post("/:messageId/react", reactToMessage);
export default router;