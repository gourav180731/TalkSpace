import crypto from "crypto";
import MessageModal from "../models/message.model";
import { getIO } from "../socketEmitter";
import { onlineUsers } from "../socket";
import { BOT_USER_ID } from "../utils/constants";

function fakeAIReply(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes("hello") || msg.includes("hi"))
    return "Heyyy 😄 What’s up?";

  if (msg.includes("how are you"))
    return "I’m doing good 😊 just chilling here. You?";

  if (msg.includes("help"))
    return "Sure! Tell me what you need 👀";

  if (msg.includes("bye"))
    return "Bye bye 👋 Take care!";

  if (msg.includes("thanks"))
    return "Anytimeee 😄";

  return "Haha 😄 tell me more!";
}

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "🙂"
  );
}

export async function handleAIBotReply({
  chatId,
  userMessage,
  userId,
}: {
  chatId: string;
  userMessage: string;
  userId: string;
}) {
  const io = getIO();
  const socketId = onlineUsers.get(userId);

  if (socketId) {
    io.to(socketId).emit("typing", { from: BOT_USER_ID });
  }

  const history = await MessageModal.find({ chatId })
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  const context = history
    .reverse()
    .map((m) =>
      m.senderId.toString() === BOT_USER_ID
        ? `AI: ${m.text}`
        : `User: ${m.text}`
    )
    .join("\n");

  const prompt = `
You are ChitChat AI 🤖.
You are friendly, casual, and helpful.
Talk like a real friend.
Keep replies short, natural, and fun.
Use emojis sometimes 😊.

Conversation so far:
${context}

User: ${userMessage}
AI:
`;

  let reply = "🙂";

  try {
    reply = await callGemini(prompt);
  } catch {
    reply = fakeAIReply(userMessage);
  }

  await new Promise((r) =>
    setTimeout(r, Math.min(1200, reply.length * 18))
  );

  const botMsg = await MessageModal.create({
    chatId,
    senderId: BOT_USER_ID,
    receiverId: userId,
    text: reply,
      status: "sent",
     isRead: true,
    clientId: crypto.randomUUID(),
  });

  if (socketId) {
    io.to(socketId).emit("stop-typing", { from: BOT_USER_ID });
    io.to(socketId).emit("new-message", {
      message: botMsg,
    });
  }
}
