import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import { logCall } from "./controllers/calls/callHistory.controller";

export const onlineUsers = new Map<string, string>();

const userLastMessage = new Map<string, number>();
const messageTracker = new Map<string, number[]>();
const mutedUsers = new Map<string, number>();
const ongoingCalls = new Map<string, { partnerId: string; startTime?: Date; callType?: string }>();

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
    socket.on("stop-typing", ({ to }) => {
      const socketId = onlineUsers.get(to);
      if (socketId) io.to(socketId).emit("stop-typing", { from: userId });
    });
    socket.on("group-typing", ({ groupId }) => {
      socket.to(groupId).emit("group-typing", { from: userId, groupId });
    });
    socket.on("join-group", ({ groupId }) => { socket.join(groupId); });
    socket.on("leave-group", ({ groupId }) => { socket.leave(groupId); });

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

      const startTime=new Date();
      ongoingCalls.set(userId, { partnerId: to, startTime, callType: type || "audio" });
      ongoingCalls.set(to, { partnerId: userId, startTime, callType: type || "audio" });
      try{ logCall({ caller: userId, receiver: to, callType: type || "audio", status: "outgoing", startTime }); }catch{}

      io.to(toSocketId).emit("incoming-call", {
        from: userId,
        offer,
        user,
        type: type || "audio",
      });
    });

    socket.on("answer-call", ({ to, answer }) => {
      if (!to || !answer) return;

      const now=new Date();
      if (!ongoingCalls.has(userId)) ongoingCalls.set(userId, { partnerId: to, startTime: now, callType: "audio" });
      else {
        const cur=ongoingCalls.get(userId);
        if(cur && !cur.startTime) cur.startTime=now;
      }
      if (!ongoingCalls.has(to)) ongoingCalls.set(to, { partnerId: userId, startTime: now, callType: "audio" });
      else {
        const cur2=ongoingCalls.get(to);
        if(cur2 && !cur2.startTime) cur2.startTime=now;
      }

      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-answered", { from: userId, answer });
      }
      // Update call history to connected (we keep outgoing record, completed will be logged on end)
    });

    socket.on("reject-call", ({ to }) => {
      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-rejected", { from: userId });
      }
      try{
        const callerInfo=ongoingCalls.get(userId) || ongoingCalls.get(to);
        const callType=callerInfo?.callType || "audio";
        const start=callerInfo?.startTime || new Date();
        logCall({ caller: userId, receiver: to, callType: callType as any, status: "rejected", startTime: start, endTime: new Date(), duration: 0 });
      }catch{}
      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);
    });

    socket.on("end-call", ({ to }) => {
      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-ended", { from: userId });
      }
      try{
        const info=ongoingCalls.get(userId) || ongoingCalls.get(to);
        if(info && info.startTime){
          const dur=Math.floor((Date.now()- new Date(info.startTime).getTime())/1000);
          const ct=info.callType || "audio";
          // Determine caller vs receiver for log - use userId as caller if they were in map as caller
          const caller=userId;
          const receiver=to;
          logCall({ caller, receiver, callType: ct as any, status: "completed", startTime: info.startTime, endTime: new Date(), duration: dur });
        }
      }catch{}
      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);
    });

    socket.on("call-missed", ({ to }) => {
      if (!to) return;

      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-missed", { from: userId });
      }
      try{
        const info=ongoingCalls.get(userId) || ongoingCalls.get(to);
        const ct=info?.callType || "audio";
        const st=info?.startTime || new Date();
        logCall({ caller: userId, receiver: to, callType: ct as any, status: "missed", startTime: st, endTime: new Date(), duration: 0 });
      }catch{}
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

      const partnerInfo = ongoingCalls.get(userId);
      if (partnerInfo) {
        const partnerId = partnerInfo.partnerId;
        const partnerSocket = onlineUsers.get(partnerId);
        if (partnerSocket) {
          io.to(partnerSocket).emit("call-ended", { from: userId });
        }
        try{
          logCall({ caller: userId, receiver: partnerId, callType: (partnerInfo.callType as any) || "audio", status: "cancelled", startTime: partnerInfo.startTime, endTime: new Date(), duration: 0 });
        }catch{}
        ongoingCalls.delete(userId);
        ongoingCalls.delete(partnerId);
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