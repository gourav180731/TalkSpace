import mongoose, { Schema, Types, Document } from "mongoose";

export type CallType = "audio" | "video";
export type CallStatus = "missed" | "rejected" | "completed" | "cancelled" | "incoming" | "outgoing";

export interface ICallHistory extends Document {
  caller: Types.ObjectId;
  receiver: Types.ObjectId;
  callType: CallType;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // seconds
  createdAt: Date;
  updatedAt: Date;
}

const callHistorySchema = new Schema<ICallHistory>({
  caller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  callType: { type: String, enum: ["audio","video"], required: true },
  status: { type: String, enum: ["missed","rejected","completed","cancelled","incoming","outgoing"], required: true },
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number },
}, { timestamps: true });

callHistorySchema.index({ caller:1, createdAt:-1 });
callHistorySchema.index({ receiver:1, createdAt:-1 });
callHistorySchema.index({ caller:1, receiver:1, createdAt:-1 });

export default mongoose.model<ICallHistory>("CallHistory", callHistorySchema);
