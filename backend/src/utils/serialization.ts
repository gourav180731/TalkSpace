type VisibilityLevel = "everyone" | "friends" | "nobody";

export interface GroupChatDTO {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacySettingsDTO {
  userId: string;
  lastSeenVisibility: VisibilityLevel;
  onlineStatusVisibility: VisibilityLevel;
  profilePhotoVisibility: VisibilityLevel;
  statusVisibility: VisibilityLevel;
  readReceiptEnabled: boolean;
  allowMessagesFrom: "everyone" | "friends";
  allowGroupInvitesFrom: "everyone" | "friends";
}

export interface StatusUpdateDTO {
  _id: string;
  userId: string;
  contentType: "text" | "image" | "video";
  textContent?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  font?: string;
  privacyMode: "all_friends" | "friends_except" | "only_share_with";
  excludedFriends: string[];
  includedFriends: string[];
  viewers: Array<{ userId: string; viewedAt: string }>;
  expiryTime: string;
  createdAt: string;
  updatedAt: string;
}

// GroupChat
export const serializeGroupChat = (obj: any): string => {
  const dto: GroupChatDTO = {
    id: obj.id || obj._id?.toString(),
    name: obj.name,
    avatar: obj.avatar,
    description: obj.description,
    members: (obj.members || []).map((m: any) => m.toString()),
    admins: (obj.admins || []).map((a: any) => a.toString()),
    createdBy: obj.createdBy?.toString(),
    createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
  };
  return JSON.stringify(dto);
};

export const parseGroupChat = (json: string): GroupChatDTO => {
  let parsed: any;
  try { parsed = JSON.parse(json); } catch { throw new Error("Invalid JSON for GroupChat"); }
  if (!parsed.name || typeof parsed.name !== "string" || parsed.name.trim().length === 0) throw new Error("GroupChat validation failed: name is required");
  if (!Array.isArray(parsed.members) || parsed.members.length === 0) throw new Error("GroupChat validation failed: members required");
  if (!Array.isArray(parsed.admins) || parsed.admins.length === 0) throw new Error("GroupChat validation failed: admins required");
  if (!parsed.createdBy || typeof parsed.createdBy !== "string") throw new Error("GroupChat validation failed: createdBy required");
  return parsed as GroupChatDTO;
};

// PrivacySettings
export const serializePrivacySettings = (obj: any): string => {
  const dto: PrivacySettingsDTO = {
    userId: obj.userId?.toString(),
    lastSeenVisibility: obj.lastSeenVisibility,
    onlineStatusVisibility: obj.onlineStatusVisibility,
    profilePhotoVisibility: obj.profilePhotoVisibility,
    statusVisibility: obj.statusVisibility,
    readReceiptEnabled: obj.readReceiptEnabled,
    allowMessagesFrom: obj.allowMessagesFrom,
    allowGroupInvitesFrom: obj.allowGroupInvitesFrom,
  };
  return JSON.stringify(dto);
};

const allowedVisibility = ["everyone", "friends", "nobody"];
const allowedAllow = ["everyone", "friends"];

export const parsePrivacySettings = (json: string): PrivacySettingsDTO => {
  let parsed: any;
  try { parsed = JSON.parse(json); } catch { throw new Error("Invalid JSON for PrivacySettings"); }
  if (!allowedVisibility.includes(parsed.lastSeenVisibility)) throw new Error("PrivacySettings validation failed: invalid lastSeenVisibility");
  if (!allowedVisibility.includes(parsed.onlineStatusVisibility)) throw new Error("PrivacySettings validation failed: invalid onlineStatusVisibility");
  if (!allowedVisibility.includes(parsed.profilePhotoVisibility)) throw new Error("PrivacySettings validation failed: invalid profilePhotoVisibility");
  if (!allowedVisibility.includes(parsed.statusVisibility)) throw new Error("PrivacySettings validation failed: invalid statusVisibility");
  if (typeof parsed.readReceiptEnabled !== "boolean") throw new Error("PrivacySettings validation failed: readReceiptEnabled must be boolean");
  if (!allowedAllow.includes(parsed.allowMessagesFrom)) throw new Error("PrivacySettings validation failed: invalid allowMessagesFrom");
  if (!allowedAllow.includes(parsed.allowGroupInvitesFrom)) throw new Error("PrivacySettings validation failed: invalid allowGroupInvitesFrom");
  return parsed as PrivacySettingsDTO;
};

// StatusUpdate
export const serializeStatusUpdate = (obj: any): string => {
  const dto: StatusUpdateDTO = {
    _id: obj._id?.toString(),
    userId: obj.userId?.toString(),
    contentType: obj.contentType,
    textContent: obj.textContent,
    mediaUrl: obj.mediaUrl,
    backgroundColor: obj.backgroundColor,
    font: obj.font,
    privacyMode: obj.privacyMode,
    excludedFriends: (obj.excludedFriends || []).map((x: any) => x.toString()),
    includedFriends: (obj.includedFriends || []).map((x: any) => x.toString()),
    viewers: (obj.viewers || []).map((v: any) => ({ userId: v.userId?.toString(), viewedAt: new Date(v.viewedAt).toISOString() })),
    expiryTime: new Date(obj.expiryTime).toISOString(),
    createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: obj.updatedAt ? new Date(obj.updatedAt).toISOString() : new Date().toISOString(),
  };
  return JSON.stringify(dto);
};

export const parseStatusUpdate = (json: string): StatusUpdateDTO => {
  let parsed: any;
  try { parsed = JSON.parse(json); } catch { throw new Error("Invalid JSON for StatusUpdate"); }
  if (!["text", "image", "video"].includes(parsed.contentType)) throw new Error("StatusUpdate validation failed: invalid contentType");
  if (!parsed.userId || typeof parsed.userId !== "string") throw new Error("StatusUpdate validation failed: userId required");
  if (!parsed.expiryTime || isNaN(Date.parse(parsed.expiryTime))) throw new Error("StatusUpdate validation failed: invalid expiryTime");
  // size checks (text length, but media size validated in controller)
  if (parsed.textContent && parsed.textContent.length > 700) throw new Error("StatusUpdate validation failed: text too long");
  return parsed as StatusUpdateDTO;
};
