import mongoose, { Schema, Types, Document } from "mongoose";

export interface IStatusViewer {
  userId: Types.ObjectId;
  viewedAt: Date;
}

export interface IStatusUpdate extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  contentType: "text" | "image" | "video";
  textContent?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  font?: string;
  privacyMode: "all_friends" | "friends_except" | "only_share_with";
  excludedFriends: Types.ObjectId[];
  includedFriends: Types.ObjectId[];
  viewers: IStatusViewer[];
  expiryTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

const statusUpdateSchema = new Schema<IStatusUpdate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ["text", "image", "video"],
      required: true,
    },
    textContent: { type: String },
    mediaUrl: { type: String },
    backgroundColor: { type: String },
    font: { type: String },
    privacyMode: {
      type: String,
      enum: ["all_friends", "friends_except", "only_share_with"],
      default: "all_friends",
    },
    excludedFriends: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    includedFriends: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    viewers: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    expiryTime: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// TTL index to auto-delete expired statuses after expiryTime is reached
statusUpdateSchema.index({ expiryTime: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient friend status queries
statusUpdateSchema.index({ userId: 1, expiryTime: 1 });

const StatusUpdateModel = mongoose.model<IStatusUpdate>(
  "StatusUpdate",
  statusUpdateSchema
);

export default StatusUpdateModel;
