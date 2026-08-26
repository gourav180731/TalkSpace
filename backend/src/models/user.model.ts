import mongoose, { Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  username: string;
  password: string;

  isVerified: boolean;

  verificationCode?: string;
  verificationCodeExpires?: Date;

  resetPasswordOtp?: string;
  resetPasswordOtpexpires?: Date;

  refreshToken?: string;
  refreshTokenExpires?: Date;

  firstName?: string;
  lastName?: string;
  gender?: "male" | "female" | "other";
  dob?: Date;
  bio?: string;
  avatar?: string;
  avatarSource: string;

  friends: Types.ObjectId[];
  blockedUsers: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
  lastSeen: Date;
  isOnline: boolean;
  isBot: boolean;
  pinnedChats: Array<{ chatId: string; chatType: "direct" | "group"; pinnedAt: Date }>;
  archivedChats: Array<{ chatId: string; chatType: "direct" | "group"; archivedAt: Date }>;
  mutedChats: Array<{ chatId: string; chatType: "direct" | "group"; muteUntil: Date | null }>;
  favouriteChats: Array<{ chatId: string; chatType: "direct" | "group"; addedAt: Date }>;
  lockedChats: Array<{ chatId: string; chatType: "direct" | "group"; lockedAt: Date }>;
  disappearingChats: Array<{ chatId: string; chatType: "direct" | "group"; duration: string; enabledAt: Date }>;
  recentEmojis: string[];
}

const userSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: { type: String, required: true },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
    },
    verificationCodeExpires: { type: Date },
    resetPasswordOtp: { type: String },
    resetPasswordOtpexpires: { type: Date },
    refreshToken: { type: String },
    refreshTokenExpires: { type: Date },
    firstName: { type: String },
    lastName: { type: String },
    gender: { type: String, enum: ["male", "female", "other"] },
    dob: { type: Date },
    bio: { type: String },
    avatar: { type: String },
    avatarSource: {
      type: String,
      enum: ["auto", "user"],
      default: "auto",
    },

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastSeen: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },
    isBot: { type: Boolean, default: false },
    pinnedChats: [
      {
        chatId: { type: String, required: true },
        chatType: { type: String, enum: ["direct", "group"], required: true },
        pinnedAt: { type: Date, default: Date.now },
      },
    ],
    archivedChats: [
      {
        chatId: { type: String, required: true },
        chatType: { type: String, enum: ["direct", "group"], required: true },
        archivedAt: { type: Date, default: Date.now },
      },
    ],
    mutedChats: [
      {
        chatId: { type: String, required: true },
        chatType: { type: String, enum: ["direct", "group"], required: true },
        muteUntil: { type: Date, default: null },
      },
    ],
    favouriteChats: [
      { chatId: { type: String, required: true }, chatType: { type: String, enum: ["direct", "group"], required: true }, addedAt: { type: Date, default: Date.now } },
    ],
    lockedChats: [
      { chatId: { type: String, required: true }, chatType: { type: String, enum: ["direct", "group"], required: true }, lockedAt: { type: Date, default: Date.now } },
    ],
    disappearingChats: [
      { chatId: { type: String, required: true }, chatType: { type: String, enum: ["direct", "group"], required: true }, duration: { type: String, default: "24h" }, enabledAt: { type: Date, default: Date.now } },
    ],
    recentEmojis: [{ type: String }],
  },
  { timestamps: true }
);

const UserMOdel = mongoose.model<IUser>("User", userSchema);
export default UserMOdel;
