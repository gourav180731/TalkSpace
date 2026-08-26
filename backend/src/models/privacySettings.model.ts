import mongoose, { Schema, Types, Document } from "mongoose";

type VisibilityLevel = "everyone" | "friends" | "nobody";

export interface IPrivacySettings extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  lastSeenVisibility: VisibilityLevel;
  onlineStatusVisibility: VisibilityLevel;
  profilePhotoVisibility: VisibilityLevel;
  statusVisibility: VisibilityLevel;
  readReceiptEnabled: boolean;
  allowMessagesFrom: "everyone" | "friends";
  allowGroupInvitesFrom: "everyone" | "friends";
  createdAt: Date;
  updatedAt: Date;
}

const privacySettingsSchema = new Schema<IPrivacySettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    lastSeenVisibility: {
      type: String,
      enum: ["everyone", "friends", "nobody"],
      default: "everyone",
    },
    onlineStatusVisibility: {
      type: String,
      enum: ["everyone", "friends", "nobody"],
      default: "everyone",
    },
    profilePhotoVisibility: {
      type: String,
      enum: ["everyone", "friends", "nobody"],
      default: "everyone",
    },
    statusVisibility: {
      type: String,
      enum: ["everyone", "friends", "nobody"],
      default: "friends",
    },
    readReceiptEnabled: {
      type: Boolean,
      default: true,
    },
    allowMessagesFrom: {
      type: String,
      enum: ["everyone", "friends"],
      default: "everyone",
    },
    allowGroupInvitesFrom: {
      type: String,
      enum: ["everyone", "friends"],
      default: "everyone",
    },
  },
  { timestamps: true }
);

export const PrivacySettings = mongoose.model<IPrivacySettings>(
  "PrivacySettings",
  privacySettingsSchema
);
