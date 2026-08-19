import mongoose from "mongoose";
import crypto from "crypto";

export const BOT_USER_ID = process.env.BOT_USER_ID!;

export function getChatId(userA: string, userB: string) {
  const raw = [userA, userB].sort().join("_");

  const hex = crypto
    .createHash("md5")
    .update(raw)
    .digest("hex")
    .slice(0, 24);

  return new mongoose.Types.ObjectId(hex);
}
