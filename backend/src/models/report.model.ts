import mongoose, { Schema, Types, Document } from "mongoose";

export interface IReport extends Document {
  reporter: Types.ObjectId;
  reportedUser: Types.ObjectId;
  reason: string;
  messageId?: Types.ObjectId;
  chatId?: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>({
  reporter: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  reportedUser: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  reason: { type: String, required: true },
  messageId: { type: Schema.Types.ObjectId, ref: "Message" },
  chatId: { type: String },
  status: { type: String, enum: ["pending","reviewed","resolved"], default: "pending" },
}, { timestamps: true });

reportSchema.index({ reporter:1, reportedUser:1 });
export default mongoose.model<IReport>("Report", reportSchema);
