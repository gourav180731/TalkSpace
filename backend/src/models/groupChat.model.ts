import mongoose, { Schema, Types, Document } from "mongoose";

export interface IGroupMessageReaction {
  emoji: string;
  userId: Types.ObjectId;
}

export interface IGroupMessage {
  _id?: Types.ObjectId;
  senderId: Types.ObjectId;
  text?: string;
  file?: string;
  mimeType?: string;
  reactions: IGroupMessageReaction[];
  isDeleted: boolean;
  deletedFor: string[];
  replyTo?: Types.ObjectId;
  clientId?: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  isEdited: boolean;
  editedAt?: Date;
  editHistory: Array<{ originalText: string; editedAt: Date }>;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPinnedMessage {
  messageId: Types.ObjectId;
  pinnedBy: Types.ObjectId;
  pinnedAt: Date;
}

export interface IGroupChat extends Document {
  _id: Types.ObjectId;
  name: string;
  avatar?: string;
  description?: string;
  members: Types.ObjectId[];
  admins: Types.ObjectId[];
  createdBy: Types.ObjectId;
  messages: Types.DocumentArray<IGroupMessage>;
  pinnedMessages: IPinnedMessage[];
  disappearingDuration?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const groupMessageSchema = new Schema<IGroupMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String },
    file: { type: String },
    mimeType: { type: String },
    reactions: [
      {
        emoji: String,
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: {
      type: [String],
      default: [],
    },
    replyTo: {
      type: Schema.Types.ObjectId,
    },
    clientId: { type: String },
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read", "failed"],
      default: "sent",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: { type: Date },
    editHistory: [
      {
        originalText: String,
        editedAt: Date,
      },
    ],
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

const groupChatSchema = new Schema<IGroupChat>(
  {
    name: {
      type: String,
      required: true,
    },
    avatar: { type: String },
    description: { type: String },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: [groupMessageSchema],
    pinnedMessages: [
      {
        messageId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        pinnedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        pinnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    disappearingDuration: { type: String, default: null },
  },
  { timestamps: true }
);

// Indexes for performance
groupChatSchema.index({ members: 1 });
groupChatSchema.index({ "messages.createdAt": -1 });
groupChatSchema.index({ "messages.senderId": 1 });

const GroupChatModel = mongoose.model<IGroupChat>("GroupChat", groupChatSchema);

export default GroupChatModel;
