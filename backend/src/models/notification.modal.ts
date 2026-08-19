import mongoose, { Schema, Types } from "mongoose";

export interface INotification {
  user: Types.ObjectId;       
  actor?: Types.ObjectId;      
  referenceId?: Types.ObjectId; 
  type:
    | "FRIEND_REQUEST_INCOMING"
    | "FRIEND_REQUEST_ACCEPTED"
    | "FRIEND_REQUEST_REJECTED"
    | "FRIEND_REQUEST_CANCELLED"
    | "UNFRIENDED";
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    referenceId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "FRIEND_REQUEST_INCOMING",
        "FRIEND_REQUEST_ACCEPTED",
        "FRIEND_REQUEST_REJECTED",
        "FRIEND_REQUEST_CANCELLED",
        "UNFRIENDED",
      ],
      required: true,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, type: 1, referenceId: 1 });

const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);

export default Notification;
