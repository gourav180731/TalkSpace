import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import { logCall } from "./controllers/calls/callHistory.controller";

export const onlineUsers = new Map<string, string>();

const userLastMessage = new Map<string, number>();
const messageTracker = new Map<string, number[]>();
const mutedUsers = new Map<string, number>();
const ongoingCalls = new Map<string, { partnerId: string; callId: string; caller: string; receiver: string; startTime: Date; answeredAt?: Date; callType: string }>();

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
      const callId = `${userId}_${to}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      const rec = { partnerId: to, callId, caller: userId, receiver: to, startTime, callType: type || "audio" } as any;
      const rec2= { partnerId: userId, callId, caller: userId, receiver: to, startTime, callType: type || "audio" } as any;
      ongoingCalls.set(userId, rec);
      ongoingCalls.set(to, rec2);
      // Do not create history yet for outgoing (will create on terminal state to avoid duplicate), but keep for missed handling
      // Emit with callId for end-to-end correlation
      io.to(toSocketId).emit("incoming-call", {
        from: userId,
        offer,
        user,
        type: type || "audio",
        callId,
      });
      // also ack caller with callId for later end
      socket.emit("call-initiated", { to, callId, type: type || "audio" });
    });

    socket.on("answer-call", ({ to, answer }) => {
      if (!to || !answer) return;

      const now=new Date();
      // mark answeredAt for duration calculation
      const curA = ongoingCalls.get(userId);
      const curB = ongoingCalls.get(to);
      if(curA && !curA.answeredAt) curA.answeredAt = now;
      if(curB && !curB.answeredAt) curB.answeredAt = now;
      // fallback create if not exists (e.g. server restart)
      if (!ongoingCalls.has(userId)) ongoingCalls.set(userId, { partnerId: to, callId: `${to}_${userId}_${Date.now()}`, caller: to, receiver: userId, startTime: now, answeredAt: now, callType: "audio" } as any);
      if (!ongoingCalls.has(to)) ongoingCalls.set(to, { partnerId: userId, callId: curA?.callId || `${to}_${userId}_${Date.now()}`, caller: curA?.caller || to, receiver: curA?.receiver || userId, startTime: curA?.startTime || now, answeredAt: now, callType: curA?.callType || "audio" } as any);

      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        const callId = curA?.callId || curB?.callId;
        io.to(toSocketId).emit("call-answered", { from: userId, answer, callId });
      }
    });

    socket.on("reject-call", async ({ to, callId: clientCallId }) => {
      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-rejected", { from: userId, callId: clientCallId });
      }
      try{
        let info=ongoingCalls.get(userId) || ongoingCalls.get(to);
        let callId = info?.callId || clientCallId;
        let origCaller = info?.caller;
        let origReceiver = info?.receiver;
        if((!origCaller || !origReceiver) && callId){
          try{ const { default: CallHistory } = await import("./models/callHistory.model"); const rec:any = await CallHistory.findOne({callId}); if(rec){ origCaller = rec.caller.toString(); origReceiver = rec.receiver.toString(); }}catch{}
        }
        if(!origCaller) origCaller = to;
        if(!origReceiver) origReceiver = userId;
        const callType=info?.callType || "audio";
        const start=info?.startTime || new Date();
        await logCall({ callId, caller: origCaller, receiver: origReceiver, callType: callType as any, status: "rejected", startTime: start, endTime: new Date(), duration: 0 });
      }catch{}
      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);
    });

    socket.on("end-call", async ({ to, callId: clientCallId }) => {
      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-ended", { from: userId, callId: clientCallId });
      }
      try{
        let info=ongoingCalls.get(userId) || ongoingCalls.get(to);
        let cid = info?.callId || clientCallId;
        let caller = info?.caller;
        let receiver = info?.receiver;
        let ct=info?.callType || "audio";
        let st=info?.startTime;
        let ans=info?.answeredAt;
        if((!caller || !receiver) && cid){
          try{ const { default: CallHistory } = await import("./models/callHistory.model"); const rec:any = await CallHistory.findOne({callId: cid}); if(rec){ caller = rec.caller.toString(); receiver = rec.receiver.toString(); ct = rec.callType; st = rec.startTime; ans = rec.answeredAt; }}catch{}
        }
        if(!caller || !receiver){
          // Fallback: assume still original: use info or infer caller is initial caller (to if we are receiver)
          // Best fallback without DB is to use stored caller if any, otherwise assume userId was callee ending -> caller=to
          caller = caller || info?.caller || to;
          receiver = receiver || info?.receiver || userId;
        }
        // Only create completed if call was answered, else cancelled
        let status: any = ans ? "completed" : "cancelled";
        let dur = 0;
        if(ans){
          dur = Math.max(0, Math.floor((Date.now() - ans.getTime())/1000));
          if(dur===0) dur = 1;
        }
        await logCall({ callId: cid, caller, receiver, callType: ct as any, status, startTime: st || new Date(), answeredAt: ans, endTime: new Date(), duration: dur });
      }catch{}
      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);
    });

    socket.on("call-missed", async ({ to, callId: clientCallId }) => {
      if (!to) return;

      const toSocketId = onlineUsers.get(to);
      if (toSocketId) {
        io.to(toSocketId).emit("call-missed", { from: userId, callId: clientCallId });
      }
      try{
        let info=ongoingCalls.get(userId) || ongoingCalls.get(to);
        if(info?.answeredAt) return;
        let cid=info?.callId || clientCallId;
        let caller=info?.caller;
        let receiver=info?.receiver;
        if((!caller || !receiver) && cid){
          try{ const { default: CallHistory } = await import("./models/callHistory.model"); const rec:any = await CallHistory.findOne({callId: cid}); if(rec){ caller = rec.caller.toString(); receiver = rec.receiver.toString(); }}catch{}
        }
        if(!caller) caller = info?.caller || userId;
        if(!receiver) receiver = info?.receiver || to;
        const ct=info?.callType || "audio";
        const st=info?.startTime || new Date();
        await logCall({ callId: cid, caller, receiver, callType: ct as any, status: "missed", startTime: st, endTime: new Date(), duration: 0 });
      }catch{}
      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);

    });

    // Group call handling (up to 8 participants, offline not blocking)
    socket.on("group-call-start", async ({ groupId, type }) => {
      try{
        const { default: GroupChat } = await import("./models/groupChat.model");
        const g:any = await GroupChat.findOne({ _id: groupId, members: userId });
        if(!g) return;
        if(g.members.length > 8) { socket.emit("error", "Group call limited to 8 participants"); return; }
        const callId = `${groupId}_${userId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        ongoingCalls.set(userId, { partnerId: groupId, callId, caller: userId, receiver: groupId, startTime: new Date(), answeredAt: new Date(), callType: type||"audio", groupId } as any);
        for(const mem of g.members){
          const mid = mem.toString();
          if(mid===userId) continue;
          const sid = onlineUsers.get(mid);
          if(sid) io.to(sid).emit("incoming-group-call", { groupId, callId, from: userId, type: type||"audio", groupName: g.name, groupAvatar: g.avatar });
        }
        socket.emit("group-call-started", { groupId, callId });
      }catch{}
    });
    socket.on("group-call-accept", async ({ groupId, callId }) => {
      try{
        const info:any = ongoingCalls.get(userId);
        if(!info || info.partnerId!==groupId) {
          ongoingCalls.set(userId, { partnerId: groupId, callId: callId || `${groupId}_${userId}_${Date.now()}`, caller: info?.caller || userId, receiver: groupId, startTime: new Date(), answeredAt: new Date(), callType: info?.callType||"audio", groupId } as any);
        } else if(!info.answeredAt) info.answeredAt = new Date();
      }catch{}
    });
    socket.on("group-call-reject", async ({ groupId, callId }) => {
      try{
        const info:any = ongoingCalls.get(userId);
        const cid = info?.callId || callId;
        // For group, reject is per participant, not global call end - just log as rejected for that user if they were invited but declined
        // We don't create global group call history for single reject, but per-user history could be created as missed/rejected
        // For now, just clean up this user's ongoing entry
        ongoingCalls.delete(userId);
        // Optionally log a rejected group call record for this user
        await logCall({ callId: cid || `${groupId}_${userId}_${Date.now()}`, caller: userId, receiver: groupId, groupId, isGroupCall:true, callType: (info?.callType as any)||"audio", status:"rejected" as any, startTime: new Date(), endTime: new Date(), duration:0 });
      }catch{}
    });
    socket.on("group-call-end", async ({ groupId, callId: clientCallId, duration }) => {
      try{
        const info:any = ongoingCalls.get(userId);
        const cid = info?.callId || clientCallId || `${groupId}_${userId}_${Date.now()}`;
        const ans = info?.answeredAt || info?.startTime;
        let dur = duration;
        if(!dur && ans) dur = Math.max(0, Math.floor((Date.now() - new Date(ans).getTime())/1000)) || 1;
        if(!dur) dur = 0;
        const status = dur>0 ? "completed" : "cancelled";
        await logCall({ callId: cid, caller: userId, receiver: groupId, groupId, isGroupCall: true, callType: (info?.callType as any)||"audio", status: status as any, startTime: info?.startTime || new Date(), answeredAt: ans, endTime: new Date(), duration: dur });
        ongoingCalls.delete(userId);
        const { default: GroupChat } = await import("./models/groupChat.model");
        const g:any = await GroupChat.findById(groupId);
        if(g){
          for(const mem of g.members){
            const mid = mem.toString();
            const sid = onlineUsers.get(mid);
            if(sid) io.to(sid).emit("group-call-ended", { groupId, callId: cid });
          }
        }
      }catch{}
    });

    socket.on("group-call-offer", ({ groupId, to, offer, type }) => {
      // Relay offer to specific member or group
      if(to){
        const sid=onlineUsers.get(to);
        if(sid) io.to(sid).emit("group-call-offer", { groupId, offer, from: userId, type });
      } else {
        socket.to(groupId).emit("group-call-offer", { groupId, offer, from: userId, type });
      }
    });
    socket.on("group-call-answer", ({ groupId, to, answer }) => {
      if(to){
        const sid=onlineUsers.get(to);
        if(sid) io.to(sid).emit("group-call-answer", { from: userId, answer, groupId });
      } else {
        socket.to(groupId).emit("group-call-answer", { from: userId, answer, groupId });
      }
    });
    socket.on("group-ice-candidate", ({ groupId, to, candidate }) => {
      if(to){
        const sid=onlineUsers.get(to);
        if(sid) io.to(sid).emit("group-ice-candidate", { from: userId, candidate, groupId });
      } else {
        socket.to(groupId).emit("group-ice-candidate", { from: userId, candidate, groupId });
      }
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
          io.to(partnerSocket).emit("call-ended", { from: userId, callId: partnerInfo.callId });
        }
        try{
          // If already answered, treat as completed with duration up to disconnect
          const ans = partnerInfo.answeredAt;
          const caller = partnerInfo.caller || userId;
          const receiver = partnerInfo.receiver || partnerId;
          let status: any = ans ? "completed" : "cancelled";
          let dur = 0;
          if(ans) dur = Math.max(0, Math.floor((Date.now() - ans.getTime())/1000)) || 1;
          logCall({ callId: partnerInfo.callId, caller, receiver, callType: (partnerInfo.callType as any) || "audio", status, startTime: partnerInfo.startTime, answeredAt: ans, endTime: new Date(), duration: dur });
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