import { Types } from "mongoose";

export type VisibilityLevel = "everyone" | "friends" | "nobody";

export interface PrivacySettingsLike {
  lastSeenVisibility: VisibilityLevel;
  onlineStatusVisibility: VisibilityLevel;
  profilePhotoVisibility: VisibilityLevel;
  statusVisibility: VisibilityLevel;
  readReceiptEnabled: boolean;
  allowMessagesFrom: "everyone" | "friends";
  allowGroupInvitesFrom: "everyone" | "friends";
}

const shouldHide = (visibility: VisibilityLevel, isFriend: boolean): boolean => {
  if (visibility === "nobody") return true;
  if (visibility === "friends" && !isFriend) return true;
  return false;
};

export const applyPrivacyFilters = (
  requesterId: string,
  targetUser: any,
  privacySettings: PrivacySettingsLike | null,
  isFriend: boolean
) => {
  if (!privacySettings) return targetUser;
  const filtered = { ...targetUser };
  // Handle both plain object and mongoose doc
  const toObj = filtered.toObject ? filtered.toObject() : filtered;
  const out: any = { ...toObj };
  if (shouldHide(privacySettings.lastSeenVisibility, isFriend)) {
    delete out.lastSeen;
  }
  if (shouldHide(privacySettings.onlineStatusVisibility, isFriend)) {
    delete out.isOnline;
  }
  if (shouldHide(privacySettings.profilePhotoVisibility, isFriend)) {
    delete out.avatar;
  }
  return out;
};

export const canViewStatus = (
  viewerId: string,
  creatorId: string,
  privacySettings: PrivacySettingsLike | null,
  isFriend: boolean
): boolean => {
  if (viewerId === creatorId) return true;
  if (!privacySettings) return isFriend;
  const v = privacySettings.statusVisibility;
  if (v === "nobody") return false;
  if (v === "friends" && !isFriend) return false;
  return true;
};

export const shouldSendReadReceipt = (privacy: PrivacySettingsLike | null): boolean => {
  if (!privacy) return true;
  return privacy.readReceiptEnabled;
};

export const canSendMessage = (
  senderId: string,
  receiverPrivacy: PrivacySettingsLike | null,
  isFriend: boolean,
  isBlocked: boolean
): boolean => {
  if (isBlocked) return false;
  if (!receiverPrivacy) return true;
  if (receiverPrivacy.allowMessagesFrom === "friends" && !isFriend) return false;
  return true;
};

export const canInviteToGroup = (
  inviterId: string,
  inviteePrivacy: PrivacySettingsLike | null,
  isFriend: boolean
): boolean => {
  if (!inviteePrivacy) return true;
  if (inviteePrivacy.allowGroupInvitesFrom === "friends" && !isFriend) return false;
  return true;
};
