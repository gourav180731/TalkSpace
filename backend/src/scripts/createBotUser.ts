import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.model";

const MONGO_URI = process.env.MONGO_URL as string;

// Bot avatar CDN (you can change later)
const BOT_AVATAR_URL =
  "https://www.shutterstock.com/image-vector/chat-bot-icon-design-robot-600nw-2476207303.jpg";

async function createBotUser() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI not found");
  }

  await mongoose.connect(MONGO_URI);

  const botUser = await User.findOneAndUpdate(
    { username: "chitchat_ai" }, 
    {
      name: "ChitChat AI 🤖",
      username: "chitchat_ai",
      email: "bot@chitchat.app",
      avatar: BOT_AVATAR_URL,
      isBot: true,
      isOnline: false, 
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  console.log("Bot user ready:", botUser._id.toString());

  await mongoose.disconnect();
}

createBotUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(" Failed to create bot user", err);
    process.exit(1);
  });
