import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";

export const onlineUsers = new Map<string, string>();

const userLastMessage = new Map<string, number>();
const messageTracker = new Map<string, number[]>();
const mutedUsers = new Map<string, number>();
const ongoingCalls = new Map<string, string>();

export function initSocket(io: Server) {
  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie || "";
      const cookies = cookie.parse(rawCookie);

      const token = cookies.accessToken;
      if (!token) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET!
      ) as { userId: string };

      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    console.log("✅ SOCKET CONNECTED:", userId);

    socket.emit("online-users", Array.from(onlineUsers.keys()));

    onlineUsers.set(userId, socket.id);
    socket.broadcast.emit("user-online", userId);

    socket.on("typing", ({ to }) => {
      const socketId = onlineUsers.get(to);
      if (socketId) {
        io.to(socketId).emit("typing", { from: userId });
      }
    });

    socket.on("call-user", ({ to, offer, user, type }) => {
      if (!to || !offer) return;

      const toSocketId = onlineUsers.get(to);

      if (!toSocketId) {
        socket.emit("error", "User is offline");
        return;
      }

      if (ongoingCalls.has(userId)) {
        socket.emit("error", "You are already in a call");
        return;
      }

      if (ongoingCalls.has(to)) {
        socket.emit("call-busy", { to });
        return;
      }

      ongoingCalls.set(userId, to);
      ongoingCalls.set(to, userId);

      io.to(toSocketId).emit("incoming-call", {
        from: userId,
        offer,
        user,
        type: type || "audio",
      });
    });

    socket.on("answer-call", ({ to, answer }) => {
      if (!to || !answer) return;

      if (!ongoingCalls.has(userId)) ongoingCalls.set(userId, to);
      if (!ongoingCalls.has(to)) ongoingCalls.set(to, userId);

      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-answered", { from: userId, answer });
      }
    });

    socket.on("reject-call", ({ to }) => {
      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-rejected", { from: userId });
      }
      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);
    });

    socket.on("end-call", ({ to }) => {
      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-ended", { from: userId });
      }
      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);
    });

    socket.on("call-missed", ({ to }) => {
      if (!to) return;

      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-missed", { from: userId });
      }

      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);

    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      if (!to || !candidate) return;

      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("ice-candidate", { from: userId, candidate });
      }
    });

    const handleMessage = (data: any) => {
      const now = Date.now();

      const muteEnd = mutedUsers.get(userId);
      if (muteEnd && muteEnd > now) {
        socket.emit("error", "You are temporarily muted for spam");
        return;
      }

      const lastTime = userLastMessage.get(userId) || 0;
      if (now - lastTime < 800) {
        socket.emit("error", "You're sending messages too fast");
        return;
      }
      userLastMessage.set(userId, now);

      if (!messageTracker.has(userId)) messageTracker.set(userId, []);

      const timestamps = messageTracker.get(userId)!;
      timestamps.push(now);

      const filtered = timestamps.filter((t) => now - t < 10000);
      messageTracker.set(userId, filtered);

      if (filtered.length > 25) {
        mutedUsers.set(userId, now + 60000);
        socket.emit("error", "Spam detected. You are muted for 1 min");
        return;
      }

      if (!data?.to || !data?.message) {
        socket.emit("error", "Invalid message data");
        return;
      }

      const toSocketId = onlineUsers.get(data.to);
      if (toSocketId) {
        io.to(toSocketId).emit("receive_message", { from: userId, message: data.message });
      }
    };

    socket.on("send_message", handleMessage);
    socket.on("message", handleMessage);

    socket.on("disconnect", () => {
      console.log("❌ SOCKET DISCONNECTED:", userId);

      onlineUsers.delete(userId);

      const partner = ongoingCalls.get(userId);
      if (partner) {
        const partnerSocket = onlineUsers.get(partner);
        if (partnerSocket) {
          io.to(partnerSocket).emit("call-ended", { from: userId });
        }
        ongoingCalls.delete(userId);
        ongoingCalls.delete(partner);
      }

      socket.broadcast.emit("user-offline", { userId, lastSeen: new Date() });
    });
  });
}

setInterval(() => {
  const now = Date.now();

  for (const [userId, timestamps] of messageTracker.entries()) {
    const filtered = timestamps.filter((t) => now - t < 10000);
    if (filtered.length === 0) messageTracker.delete(userId);
    else messageTracker.set(userId, filtered);
  }

  for (const [userId, muteEnd] of mutedUsers.entries()) {
    if (muteEnd < now) mutedUsers.delete(userId);
  }
}, 30000);