import mongoose, { Schema, Types, Document } from "mongoose";
export interface IFeedback extends Document {
  userId: Types.ObjectId;
  message: string;
  category?: string;
  createdAt: Date;
}
const feedbackSchema = new Schema<IFeedback>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  message: { type: String, required: true, maxlength: 2000 },
  category: { type: String, default: "general" },
}, { timestamps: true });
export default mongoose.model<IFeedback>("Feedback", feedbackSchema);
