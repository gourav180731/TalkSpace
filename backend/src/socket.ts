import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import { logCall } from "./controllers/calls/callHistory.controller";

// Legacy single-socket map for backward compatibility where controllers expect string
export const onlineUsers = new Map<string, string>();
// New multi-socket accurate presence
export const userSockets = new Map<string, Set<string>>();
export const socketToUser = new Map<string, string>();
const offlineTimers = new Map<string, NodeJS.Timeout>();

const userLastMessage = new Map<string, number>();
const messageTracker = new Map<string, number[]>();
const mutedUsers = new Map<string, number>();
const ongoingCalls = new Map<string, { partnerId: string; callId: string; caller: string; receiver: string; startTime: Date; answeredAt?: Date; callType: string; groupId?: string }>();

function getUserSocketIds(userId: string): string[] {
  const set = userSockets.get(userId);
  return set ? Array.from(set) : [];
}
function isUserOnline(userId: string): boolean {
  const set = userSockets.get(userId);
  if (set && set.size > 0) return true;
  // grace period: still considered online while offline timer pending (refresh/reconnect)
  if (offlineTimers.has(userId)) return true;
  // legacy fallback
  if (onlineUsers.has(userId)) return true;
  return false;
}
function getOnlineUserIds(): string[] {
  const ids = new Set<string>();
  for (const [uid, set] of userSockets.entries()) if (set.size > 0) ids.add(uid);
  for (const uid of offlineTimers.keys()) ids.add(uid);
  return Array.from(ids);
}
function emitToUser(io: Server, userId: string, event: string, data: any) {
  const ids = getUserSocketIds(userId);
  if (ids.length > 0) { for (const sid of ids) io.to(sid).emit(event, data); return; }
  // during grace period set may be empty but timer pending - no socket to emit, skip (user is refreshing)
  const legacy = onlineUsers.get(userId);
  if (legacy) io.to(legacy).emit(event, data);
}
function emitToUserWithPrivacy(io: Server, targetId: string, event: string, data: any) {
  // privacy is handled at broadcast level, for direct emits skip check
  emitToUser(io, targetId, event, data);
}

async function autoJoinGroups(socket: Socket, userId: string) {
  try {
    const { default: GroupChat } = await import("./models/groupChat.model");
    const groups: any = await GroupChat.find({ members: userId }).select("_id").lean();
    for (const g of groups) socket.join(g._id.toString());
  } catch {}
}

export function initSocket(io: Server) {
  // On server start, clear stale online flags in DB
  import("./models/user.model").then(({ default: UserModel }) => {
    UserModel.updateMany({}, { $set: { isOnline: false } }).catch(() => {});
  });

  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie || "";
      const cookies = cookie.parse(rawCookie);
      const token = cookies.accessToken;
      if (!token) return next(new Error("Unauthorized"));
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId as string;
    console.log("✅ SOCKET CONNECTED:", userId, socket.id);

    // handle multi-socket: add to set with grace (refresh/call should NOT appear offline)
    const wasOffline = !isUserOnline(userId);
    // clear pending offline timer if reconnect within grace (must before adding to set, so isUserOnline sees timer)
    const pendingTimer = offlineTimers.get(userId);
    if (pendingTimer) { clearTimeout(pendingTimer); offlineTimers.delete(userId); }
    let set = userSockets.get(userId);
    if (!set) { set = new Set(); userSockets.set(userId, set); }
    set.add(socket.id);
    socketToUser.set(socket.id, userId);
    onlineUsers.set(userId, socket.id);

    // update DB isOnline
    if (wasOffline) {
      try { const { default: UserModel } = await import("./models/user.model"); await UserModel.updateOne({ _id: userId }, { $set: { isOnline: true } }); } catch {}
      // broadcast online respecting privacy (simple broadcast to all for now; privacy filtered on fetch, and frontend respects privacy settings via separate check)
      // We still need to respect onlineStatusVisibility: only emit to those allowed to see presence
      // For performance, broadcast to all sockets and let frontend privacy layer filter? But spec says backend must not leak.
      // We will emit to all but frontend will hide based on privacy? Safer to filter via helper: emit to all online users who can see.
      // For now broadcast to all via io.emit and frontend will check privacy? We'll implement filtered via iterating over all userSockets keys.
      try {
        const { canViewerSeePresence } = await import("./socket.presence");
        for (const [viewerId, sids] of userSockets.entries()) {
          if (viewerId === userId) continue;
          const canSee = await canViewerSeePresence(viewerId, userId);
          if (!canSee) continue;
          for (const sid of sids) io.to(sid).emit("user-online", userId);
        }
      } catch {
        socket.broadcast.emit("user-online", userId);
      }
    }

    // send initial online list filtered by viewer's privacy view
    try {
      const { canViewerSeePresence } = await import("./socket.presence");
      const allOnline = Array.from(userSockets.keys()).filter((id) => id !== userId && isUserOnline(id));
      const visible: string[] = [];
      for (const oid of allOnline) {
        const canSee = await canViewerSeePresence(userId, oid);
        if (canSee) visible.push(oid);
      }
      socket.emit("online-users", visible);
      // also send lastSeen map for offline users? frontend expects lastSeen via separate event? We'll emit via presence sync route instead.
    } catch {
      socket.emit("online-users", Array.from(userSockets.keys()).filter((id) => isUserOnline(id) && id !== userId));
    }

    // auto-join all group rooms
    await autoJoinGroups(socket, userId);

    // presence sync request handler
    socket.on("presence:sync", async () => {
      try {
        const { canViewerSeePresence } = await import("./socket.presence");
        const allOnline = Array.from(userSockets.keys()).filter((id) => isUserOnline(id));
        const visible: string[] = [];
        for (const oid of allOnline) {
          if (oid === userId) continue;
          const canSee = await canViewerSeePresence(userId, oid);
          if (canSee) visible.push(oid);
        }
        socket.emit("online-users", visible);
        // also emit presence:sync-response with lastSeen for offline friends?
        const { default: UserModel } = await import("./models/user.model");
        const me: any = await UserModel.findById(userId).select("friends").lean();
        const friendIds: string[] = (me?.friends || []).map((f: any) => f.toString());
        const friendsData: any[] = await UserModel.find({ _id: { $in: friendIds } }).select("lastSeen isOnline").lean();
        const lastSeenMap: Record<string, string> = {};
        for (const f of friendsData) {
          if (!isUserOnline(f._id.toString())) lastSeenMap[f._id.toString()] = f.lastSeen ? new Date(f.lastSeen).toISOString() : "";
        }
        socket.emit("presence:sync-response", { onlineUsers: visible, lastSeen: lastSeenMap });
      } catch {}
    });

    // secure join-group with membership check
    socket.on("join-group", async ({ groupId }) => {
      try {
        if (!groupId) return;
        const { default: GroupChat } = await import("./models/groupChat.model");
        const g: any = await GroupChat.findOne({ _id: groupId, members: userId }).select("_id").lean();
        if (!g) { socket.emit("error", "Not a group member"); return; }
        socket.join(groupId);
      } catch {}
    });
    socket.on("leave-group", async ({ groupId }) => {
      try { socket.leave(groupId); } catch {}
    });

    socket.on("typing", ({ to }) => {
      if (!to) return;
      emitToUser(io, to, "typing", { from: userId });
    });
    socket.on("stop-typing", ({ to }) => {
      if (!to) return;
      emitToUser(io, to, "stop-typing", { from: userId });
    });
    socket.on("group-typing", ({ groupId }) => {
      socket.to(groupId).emit("group-typing", { from: userId, groupId });
    });

    socket.on("call-user", ({ to, offer, user, type }) => {
      if (!to || !offer) return;
      if (!isUserOnline(to)) { socket.emit("error", "User is offline"); return; }
      if (ongoingCalls.has(userId)) { socket.emit("error", "You are already in a call"); return; }
      if (ongoingCalls.has(to)) { socket.emit("call-busy", { to }); return; }
      const startTime = new Date();
      const callId = `${userId}_${to}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const rec = { partnerId: to, callId, caller: userId, receiver: to, startTime, callType: type || "audio" } as any;
      const rec2 = { partnerId: userId, callId, caller: userId, receiver: to, startTime, callType: type || "audio" } as any;
      ongoingCalls.set(userId, rec);
      ongoingCalls.set(to, rec2);
      emitToUser(io, to, "incoming-call", { from: userId, offer, user, type: type || "audio", callId });
      socket.emit("call-initiated", { to, callId, type: type || "audio" });
    });

    socket.on("answer-call", ({ to, answer }) => {
      if (!to || !answer) return;
      const now = new Date();
      const curA = ongoingCalls.get(userId);
      const curB = ongoingCalls.get(to);
      if (curA && !curA.answeredAt) curA.answeredAt = now;
      if (curB && !curB.answeredAt) curB.answeredAt = now;
      if (!ongoingCalls.has(userId)) ongoingCalls.set(userId, { partnerId: to, callId: `${to}_${userId}_${Date.now()}`, caller: to, receiver: userId, startTime: now, answeredAt: now, callType: "audio" } as any);
      if (!ongoingCalls.has(to)) ongoingCalls.set(to, { partnerId: userId, callId: curA?.callId || `${to}_${userId}_${Date.now()}`, caller: curA?.caller || to, receiver: curA?.receiver || userId, startTime: curA?.startTime || now, answeredAt: now, callType: curA?.callType || "audio" } as any);
      const callId = curA?.callId || curB?.callId;
      emitToUser(io, to, "call-answered", { from: userId, answer, callId });
    });

    socket.on("reject-call", async ({ to, callId: clientCallId }) => {
      emitToUser(io, to, "call-rejected", { from: userId, callId: clientCallId });
      try {
        let info = ongoingCalls.get(userId) || ongoingCalls.get(to);
        let callId = info?.callId || clientCallId;
        let origCaller = info?.caller;
        let origReceiver = info?.receiver;
        if ((!origCaller || !origReceiver) && callId) {
          try { const { default: CallHistory } = await import("./models/callHistory.model"); const rec: any = await CallHistory.findOne({ callId }); if (rec) { origCaller = rec.caller.toString(); origReceiver = rec.receiver.toString(); } } catch {}
        }
        if (!origCaller) origCaller = to;
        if (!origReceiver) origReceiver = userId;
        const callType = info?.callType || "audio";
        const start = info?.startTime || new Date();
        await logCall({ callId, caller: origCaller, receiver: origReceiver, callType: callType as any, status: "rejected", startTime: start, endTime: new Date(), duration: 0 });
      } catch {}
      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);
    });

    socket.on("end-call", async ({ to, callId: clientCallId }) => {
      emitToUser(io, to, "call-ended", { from: userId, callId: clientCallId });
      try {
        let info = ongoingCalls.get(userId) || ongoingCalls.get(to);
        let cid = info?.callId || clientCallId;
        let caller = info?.caller;
        let receiver = info?.receiver;
        let ct = info?.callType || "audio";
        let st = info?.startTime;
        let ans = info?.answeredAt;
        if ((!caller || !receiver) && cid) {
          try { const { default: CallHistory } = await import("./models/callHistory.model"); const rec: any = await CallHistory.findOne({ callId: cid }); if (rec) { caller = rec.caller.toString(); receiver = rec.receiver.toString(); ct = rec.callType; st = rec.startTime; ans = rec.answeredAt; } } catch {}
        }
        if (!caller || !receiver) { caller = caller || info?.caller || to; receiver = receiver || info?.receiver || userId; }
        let status: any = ans ? "completed" : "cancelled";
        let dur = 0;
        if (ans) { dur = Math.max(0, Math.floor((Date.now() - ans.getTime()) / 1000)); if (dur === 0) dur = 1; }
        await logCall({ callId: cid, caller, receiver, callType: ct as any, status, startTime: st || new Date(), answeredAt: ans, endTime: new Date(), duration: dur });
      } catch {}
      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);
    });

    socket.on("call-missed", async ({ to, callId: clientCallId }) => {
      if (!to) return;
      emitToUser(io, to, "call-missed", { from: userId, callId: clientCallId });
      try {
        let info = ongoingCalls.get(userId) || ongoingCalls.get(to);
        if (info?.answeredAt) return;
        let cid = info?.callId || clientCallId;
        let caller = info?.caller;
        let receiver = info?.receiver;
        if ((!caller || !receiver) && cid) {
          try { const { default: CallHistory } = await import("./models/callHistory.model"); const rec: any = await CallHistory.findOne({ callId: cid }); if (rec) { caller = rec.caller.toString(); receiver = rec.receiver.toString(); } } catch {}
        }
        if (!caller) caller = info?.caller || userId;
        if (!receiver) receiver = info?.receiver || to;
        const ct = info?.callType || "audio";
        const st = info?.startTime || new Date();
        await logCall({ callId: cid, caller, receiver, callType: ct as any, status: "missed", startTime: st, endTime: new Date(), duration: 0 });
      } catch {}
      ongoingCalls.delete(userId);
      ongoingCalls.delete(to);
    });

    // Group call handling
    socket.on("group-call-start", async ({ groupId, type }) => {
      try {
        const { default: GroupChat } = await import("./models/groupChat.model");
        const g: any = await GroupChat.findOne({ _id: groupId, members: userId });
        if (!g) return;
        if (g.members.length > 8) { socket.emit("error", "Group call limited to 8 participants"); return; }
        const callId = `${groupId}_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        ongoingCalls.set(userId, { partnerId: groupId, callId, caller: userId, receiver: groupId, startTime: new Date(), answeredAt: new Date(), callType: type || "audio", groupId } as any);
        socket.join(groupId);
        for (const mem of g.members) {
          const mid = mem.toString();
          if (mid === userId) continue;
          emitToUser(io, mid, "incoming-group-call", { groupId, callId, from: userId, type: type || "audio", groupName: g.name, groupAvatar: g.avatar });
        }
        socket.to(groupId).emit("incoming-group-call", { groupId, callId, from: userId, type: type || "audio", groupName: g.name, groupAvatar: g.avatar });
        socket.emit("group-call-started", { groupId, callId });
      } catch (e) { console.error("group-call-start error", e); }
    });
    socket.on("group-call-accept", async ({ groupId, callId }) => {
      try {
        const info: any = ongoingCalls.get(userId);
        if (!info || info.partnerId !== groupId) {
          ongoingCalls.set(userId, { partnerId: groupId, callId: callId || `${groupId}_${userId}_${Date.now()}`, caller: info?.caller || userId, receiver: groupId, startTime: new Date(), answeredAt: new Date(), callType: info?.callType || "audio", groupId } as any);
        } else if (!info.answeredAt) info.answeredAt = new Date();
        socket.join(groupId);
        socket.to(groupId).emit("group-call-participant-joined", { groupId, userId, callId: callId || info?.callId });
        const { default: GroupChat } = await import("./models/groupChat.model");
        const g: any = await GroupChat.findById(groupId);
        if (g) {
          const existing = g.members.map((m: any) => m.toString()).filter((id: string) => id !== userId);
          const inCall = existing.filter((id: string) => ongoingCalls.has(id) && (ongoingCalls.get(id) as any)?.partnerId === groupId);
          if (inCall.length > 0) socket.emit("group-call-participants", { groupId, participants: inCall, callId });
        }
      } catch (e) { console.error("group-call-accept error", e); }
    });
    socket.on("group-call-reject", async ({ groupId, callId }) => {
      try {
        const info: any = ongoingCalls.get(userId);
        const cid = info?.callId || callId;
        ongoingCalls.delete(userId);
        await logCall({ callId: cid || `${groupId}_${userId}_${Date.now()}`, caller: userId, receiver: groupId, groupId, isGroupCall: true, callType: (info?.callType as any) || "audio", status: "rejected" as any, startTime: new Date(), endTime: new Date(), duration: 0 });
      } catch {}
    });
    socket.on("group-call-end", async ({ groupId, callId: clientCallId, duration }) => {
      try {
        const info: any = ongoingCalls.get(userId);
        const cid = info?.callId || clientCallId || `${groupId}_${userId}_${Date.now()}`;
        const ans = info?.answeredAt || info?.startTime;
        let dur = duration;
        if (!dur && ans) dur = Math.max(0, Math.floor((Date.now() - new Date(ans).getTime()) / 1000)) || 1;
        if (!dur) dur = 0;
        const status = dur > 0 ? "completed" : "cancelled";
        await logCall({ callId: cid, caller: userId, receiver: groupId, groupId, isGroupCall: true, callType: (info?.callType as any) || "audio", status: status as any, startTime: info?.startTime || new Date(), answeredAt: ans, endTime: new Date(), duration: dur });
        ongoingCalls.delete(userId);
        socket.leave(groupId);
        // notify remaining participants that this user left, but keep their call alive
        socket.to(groupId).emit("group-call-participant-left", { groupId, userId, callId: cid });
        const { default: GroupChat } = await import("./models/groupChat.model");
        const g: any = await GroupChat.findById(groupId);
        if (g) {
          for (const mem of g.members) {
            const mid = mem.toString();
            if (mid === userId) continue;
            emitToUser(io, mid, "group-call-participant-left", { groupId, userId, callId: cid });
          }
        }
        // check if no one remains in call, then optionally broadcast ended to group
        const remaining = g ? g.members.filter((m: any) => ongoingCalls.has(m.toString()) && (ongoingCalls.get(m.toString()) as any)?.partnerId === groupId) : [];
        if (remaining.length === 0) {
          io.to(groupId).emit("group-call-ended", { groupId, callId: cid });
        }
      } catch {}
    });

    socket.on("group-call-offer", ({ groupId, to, offer, type }) => {
      if (to) emitToUser(io, to, "group-call-offer", { groupId, offer, from: userId, type });
      else socket.to(groupId).emit("group-call-offer", { groupId, offer, from: userId, type });
    });
    socket.on("group-call-answer", ({ groupId, to, answer }) => {
      if (to) emitToUser(io, to, "group-call-answer", { from: userId, answer, groupId });
      else socket.to(groupId).emit("group-call-answer", { from: userId, answer, groupId });
    });
    socket.on("group-ice-candidate", ({ groupId, to, candidate }) => {
      if (to) emitToUser(io, to, "group-ice-candidate", { from: userId, candidate, groupId });
      else socket.to(groupId).emit("group-ice-candidate", { from: userId, candidate, groupId });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
      if (!to || !candidate) return;
      emitToUser(io, to, "ice-candidate", { from: userId, candidate });
    });

    const handleMessage = (data: any) => {
      const now = Date.now();
      const muteEnd = mutedUsers.get(userId);
      if (muteEnd && muteEnd > now) { socket.emit("error", "You are temporarily muted for spam"); return; }
      const lastTime = userLastMessage.get(userId) || 0;
      if (now - lastTime < 800) { socket.emit("error", "You're sending messages too fast"); return; }
      userLastMessage.set(userId, now);
      if (!messageTracker.has(userId)) messageTracker.set(userId, []);
      const timestamps = messageTracker.get(userId)!;
      timestamps.push(now);
      const filtered = timestamps.filter((t) => now - t < 10000);
      messageTracker.set(userId, filtered);
      if (filtered.length > 25) { mutedUsers.set(userId, now + 60000); socket.emit("error", "Spam detected. You are muted for 1 min"); return; }
      if (!data?.to || !data?.message) { socket.emit("error", "Invalid message data"); return; }
      emitToUser(io, data.to, "receive_message", { from: userId, message: data.message });
    };

    socket.on("send_message", handleMessage);
    socket.on("message", handleMessage);

    socket.on("disconnect", async () => {
      console.log("❌ SOCKET DISCONNECTED:", userId, socket.id);
      const set = userSockets.get(userId);
      if (set) {
        set.delete(socket.id);
        socketToUser.delete(socket.id);
        if (set.size === 0) {
          // keep onlineUsers map for legacy: remove
          onlineUsers.delete(userId);
          // debounced offline: grace period 15s for refresh / reconnect / call (never appear offline while still on site)
          const timer = setTimeout(async () => {
            const curSet = userSockets.get(userId);
            if (curSet && curSet.size > 0) return; // reconnected in another tab
            userSockets.delete(userId);
            offlineTimers.delete(userId);
            try { const { default: UserModel } = await import("./models/user.model"); await UserModel.updateOne({ _id: userId }, { $set: { isOnline: false, lastSeen: new Date() } }); } catch {}
            try {
              const { canViewerSeeLastSeen } = await import("./socket.presence");
              for (const [viewerId, sids] of userSockets.entries()) {
                const canSee = await canViewerSeeLastSeen(viewerId, userId);
                if (!canSee) continue;
                for (const sid of sids) io.to(sid).emit("user-offline", { userId, lastSeen: new Date().toISOString() });
              }
            } catch {
              io.emit("user-offline", { userId, lastSeen: new Date().toISOString() });
            }
          }, 15000);
          offlineTimers.set(userId, timer);
        } else {
          // still has other sockets, keep online, update legacy map to one of remaining
          const remaining = Array.from(set)[0];
          onlineUsers.set(userId, remaining);
        }
      }

      // call cleanup should NOT affect presence: only end call for this socket's call partner, but don't mark offline
      // Find ongoing call where this socket was participant; if user still has other sockets, don't clean call? But call is per user, not per socket.
      // We keep original logic but use userSockets for lookup
      const partnerInfo = ongoingCalls.get(userId);
      if (partnerInfo) {
        // Check if user still has other sockets: if still online, don't auto end call on single socket disconnect
        if (isUserOnline(userId)) {
          // don't terminate call on tab close if another tab still in call? For now keep call alive
          console.log("User still has other sockets, not ending call on tab close");
        } else {
          const partnerId = partnerInfo.partnerId;
          // partner may be groupId or userId
          if (partnerInfo.groupId) {
            // group call: just remove this user from call, notify group
            emitToUser(io, partnerId, "group-call-ended", { groupId: partnerId, callId: partnerInfo.callId });
            // also broadcast to group room?
            io.to(partnerId).emit("group-call-ended", { groupId: partnerId, callId: partnerInfo.callId });
          } else {
            emitToUser(io, partnerId, "call-ended", { from: userId, callId: partnerInfo.callId });
          }
          try {
            const ans = partnerInfo.answeredAt;
            const caller = partnerInfo.caller || userId;
            const receiver = partnerInfo.receiver || partnerId;
            let status: any = ans ? "completed" : "cancelled";
            let dur = 0;
            if (ans) dur = Math.max(0, Math.floor((Date.now() - ans.getTime()) / 1000)) || 1;
            logCall({ callId: partnerInfo.callId, caller, receiver, callType: (partnerInfo.callType as any) || "audio", status, startTime: partnerInfo.startTime, answeredAt: ans, endTime: new Date(), duration: dur });
          } catch {}
          // only delete if no other sockets keep call? For now delete when user goes fully offline
          if (!isUserOnline(userId)) {
            ongoingCalls.delete(userId);
            // don't delete partner if group? keep per-user entry
            if (!partnerInfo.groupId) ongoingCalls.delete(partnerId);
          }
        }
      }
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
