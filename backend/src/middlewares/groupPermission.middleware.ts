import { Request, Response, NextFunction } from "express";
import GroupChatModel from "../models/groupChat.model";

declare global {
  namespace Express {
    interface Request {
      group?: any;
      isGroupAdmin?: boolean;
    }
  }
}

export const groupPermissionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const groupId = req.params.groupId;
    if (!userId || !groupId) return res.status(400).json({ success: false, msg: "Missing groupId" });
    const group = await GroupChatModel.findById(groupId);
    if (!group) return res.status(404).json({ success: false, msg: "Group not found" });
    const isMember = group.members.some((m: any) => m.toString() === userId);
    if (!isMember) return res.status(403).json({ success: false, msg: "Not a group member" });
    const isAdmin = group.admins.some((a: any) => a.toString() === userId);
    req.group = group;
    req.isGroupAdmin = isAdmin;
    next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

export const requireGroupAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isGroupAdmin) return res.status(403).json({ success: false, msg: "Admin only" });
  next();
};
