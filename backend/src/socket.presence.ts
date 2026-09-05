import { PrivacySettings } from "./models/privacySettings.model";
import UserModel from "./models/user.model";

export async function canViewerSeePresence(viewerId: string, targetId: string): Promise<boolean> {
  try {
    if (viewerId === targetId) return true;
    const ps = await PrivacySettings.findOne({ userId: targetId }).lean();
    const vis = ps?.onlineStatusVisibility || "everyone";
    if (vis === "everyone") return true;
    if (vis === "nobody") return false;
    if (vis === "friends") {
      const viewer = await UserModel.findById(viewerId).select("friends").lean() as any;
      const target = await UserModel.findById(targetId).select("friends").lean() as any;
      const isFriend = viewer?.friends?.some((f: any) => f.toString() === targetId) || target?.friends?.some((f: any) => f.toString() === viewerId);
      return !!isFriend;
    }
    return true;
  } catch { return true; }
}

export async function canViewerSeeLastSeen(viewerId: string, targetId: string): Promise<boolean> {
  try {
    if (viewerId === targetId) return true;
    const ps = await PrivacySettings.findOne({ userId: targetId }).lean();
    const vis = ps?.lastSeenVisibility || "everyone";
    if (vis === "everyone") return true;
    if (vis === "nobody") return false;
    if (vis === "friends") {
      const viewer = await UserModel.findById(viewerId).select("friends").lean() as any;
      const isFriend = viewer?.friends?.some((f: any) => f.toString() === targetId);
      return !!isFriend;
    }
    return true;
  } catch { return true; }
}
