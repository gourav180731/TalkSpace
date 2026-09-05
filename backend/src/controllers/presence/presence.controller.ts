import { Request, Response } from "express";
import { userSockets } from "../../socket";
import { canViewerSeePresence, canViewerSeeLastSeen } from "../../socket.presence";
import UserModel from "../../models/user.model";

export const getPresence = async (req: Request, res: Response) => {
  try {
    const viewerId = req.user?.userId as string;
    if (!viewerId) return res.status(401).json({ success: false });
    const allOnline = Array.from(userSockets.keys()).filter((id) => (userSockets.get(id)?.size || 0) > 0);
    const visible: string[] = [];
    for (const oid of allOnline) {
      if (oid === viewerId) continue;
      const canSee = await canViewerSeePresence(viewerId, oid);
      if (canSee) visible.push(oid);
    }
    // lastSeen for friends who are offline
    const me: any = await UserModel.findById(viewerId).select("friends").lean();
    const friendIds: string[] = (me?.friends || []).map((f: any) => f.toString());
    const lastSeen: Record<string, string> = {};
    if (friendIds.length) {
      const friends: any[] = await UserModel.find({ _id: { $in: friendIds } }).select("lastSeen isOnline").lean();
      for (const f of friends) {
        const fid = f._id.toString();
        if (!visible.includes(fid) && fid !== viewerId) {
          const canSeeLast = await canViewerSeeLastSeen(viewerId, fid);
          if (canSeeLast && f.lastSeen) lastSeen[fid] = new Date(f.lastSeen).toISOString();
          else if (!canSeeLast) lastSeen[fid] = "";
        }
      }
    }
    return res.json({ success: true, onlineUsers: visible, lastSeen, meOnline: true });
  } catch (e) { return res.status(500).json({ success: false }); }
};

export const getUserPresence = async (req: Request, res: Response) => {
  try {
    const viewerId = req.user?.userId as string;
    const targetId = req.params.userId;
    const isOnline = (userSockets.get(targetId)?.size || 0) > 0;
    const canSeePresence = await canViewerSeePresence(viewerId, targetId);
    const canSeeLast = await canViewerSeeLastSeen(viewerId, targetId);
    let lastSeen: string | null = null;
    if (!isOnline && canSeeLast) {
      const u: any = await UserModel.findById(targetId).select("lastSeen").lean();
      lastSeen = u?.lastSeen ? new Date(u.lastSeen).toISOString() : null;
    }
    return res.json({ success: true, isOnline: canSeePresence ? isOnline : false, lastSeen: canSeeLast ? lastSeen : null, hidden: !canSeePresence });
  } catch (e) { return res.status(500).json({ success: false }); }
};
