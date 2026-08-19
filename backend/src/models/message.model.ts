import mongoose from "mongoose";
import { Types, Document } from "mongoose";

export interface IMessageReaction {
  emoji: string;
  userId: Types.ObjectId;
}

export interface IMessage extends Document {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  text?: string;
  file?: string;
  mimeType: string;
  isRead?: boolean;
  isDeleted?: boolean;
  deletedFor: string[];
  clientId: string,
  replyTo?: Types.ObjectId | null;
  reactions: IMessageReaction[];
  status: "sending" | "sent" | "delivered" | "read" | "failed";
}


const messageSchema = new mongoose.Schema<IMessage>({
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
  },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    text: { type: String },
  file: { type: String },
    mimeType: {type: String},
   isRead: {
  type: Boolean,
  default: false,
},
isDeleted: {
  type: Boolean,
  default: false,
},
deletedFor: {
  type: [String],
  default: [],
  },
  clientId: { type: String },
  replyTo: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Message",
  default: null,
},
reactions: [
  {
    emoji: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  ],
status: {
  type: String,
  enum: ["sending", "sent", "delivered", "read", "failed"],
  default: "sent",
},


}, { timestamps: true },

);

const MessageModal = mongoose.model<IMessage>("Message", messageSchema);

export default MessageModal;