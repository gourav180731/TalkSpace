import mongoose, { Schema, Types } from "mongoose";

export interface IFriendRequest {
  from: Types.ObjectId;
  to: Types.ObjectId;
  status: "pending" | "accepted" | "rejected"| "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}

const friendRequestSchema = new Schema<IFriendRequest>(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected","cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

friendRequestSchema.index(
  { from: 1, to: 1 },
  { unique: true }
);

friendRequestSchema.index({ to: 1, status: 1 });


const FriendRequest = mongoose.model<IFriendRequest>(
  "FriendRequest",
  friendRequestSchema
);

export default FriendRequest;
