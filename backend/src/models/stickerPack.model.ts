import mongoose, { Schema, Types, Document } from "mongoose";

export interface ISticker {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
}

export interface IStickerPack extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  thumbnail: string;
  stickers: ISticker[];
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const stickerPackSchema = new Schema<IStickerPack>(
  {
    name: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String, required: true },
    stickers: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        url: { type: String, required: true },
        thumbnail: { type: String, required: true },
      },
    ],
    isPremium: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const StickerPackModel = mongoose.model<IStickerPack>("StickerPack", stickerPackSchema);

export default StickerPackModel;
