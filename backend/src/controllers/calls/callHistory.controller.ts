import { Request, Response } from "express";
import CallHistory from "../../models/callHistory.model";
import MessageModal from "../../models/message.model";
import { Types } from "mongoose";
import { getChatId } from "../../utils/constants";
import { getIO } from "../../socketEmitter";

export const logCall = async (data: {
  caller?: string;
  receiver?: string;
  groupId?: string;
  isGroupCall?: boolean;
  callType: "audio"|"video";
  status: "missed"|"rejected"|"completed"|"cancelled"|"incoming"|"outgoing";
  startTime?: Date;
  answeredAt?: Date;
  endTime?: Date;
  duration?: number;
  callId?: string;
}) => {
  try{
    const { caller, receiver, callType, status, startTime, answeredAt, endTime, duration, callId, groupId, isGroupCall } = data as any;
    // Idempotent by callId if provided
    if(callId){
      const existing = await CallHistory.findOne({ callId });
      if(existing){
        // Update existing record terminal state
        existing.status = status as any;
        if(answeredAt) (existing as any).answeredAt = answeredAt;
        if(endTime) existing.endTime = endTime;
        if(typeof duration === "number") existing.duration = duration;
        // keep original startTime/caller/receiver/type unless overridden
        await existing.save();
        await createCallMessage({ callId, caller, receiver, groupId, isGroupCall, callType, status: status as any, duration: existing.duration||0, startTime: existing.startTime });
        return existing;
      }
      const record:any = await CallHistory.create({
        callId, caller, receiver: receiver || undefined, groupId: groupId || undefined, isGroupCall: !!isGroupCall,
        callType, status,
        startTime: startTime || new Date(),
        answeredAt,
        endTime: endTime || (status==="missed"||status==="rejected"||status==="cancelled" ? new Date() : undefined),
        duration: duration ?? 0,
      } as any);
      await createCallMessage({ callId, caller, receiver, groupId, isGroupCall, callType, status: status as any, duration: (record as any).duration||0, startTime: (record as any).startTime });
      return record;
    }
    // fallback dedup for legacy without callId
    const recent = await CallHistory.findOne({
      caller, receiver, callType,
      createdAt: { $gt: new Date(Date.now()-2000) }
    });
    if(recent && recent.status===status) return recent;
    const record = await CallHistory.create({
      caller, receiver, callType, status,
      startTime: startTime || new Date(),
      answeredAt,
      endTime: endTime || (status==="missed"||status==="rejected" ? new Date() : undefined),
      duration: duration || 0,
    });
    return record;
  }catch(e){ console.error("logCall error", e); }
};

const createCallMessage = async (data: { callId?: string; caller: string; receiver: string; groupId?: string; isGroupCall?: boolean; callType: "audio"|"video"; status: string; duration: number; startTime?: Date }) => {
  try{
    const { callId, caller, receiver, groupId, isGroupCall, callType, status, duration } = data as any;
    if(!callId) return;
    // Group call footprint goes to GroupChat, not MessageModal
    if(isGroupCall && groupId){
      try{
        const { default: GroupChat } = await import("../../models/groupChat.model");
        const g:any = await GroupChat.findById(groupId);
        if(!g) return;
        // Avoid duplicate
        const exists = (g.messages||[]).some((m:any)=> m.callId===callId);
        if(exists){
          // update existing
          g.messages = g.messages.map((m:any)=> m.callId===callId ? {...m.toObject?m.toObject():m, callStatus: status, callDuration: duration, callType } : m);
          await g.save();
        } else {
          const durText = duration ? `${Math.floor(duration/60)>0 ? Math.floor(duration/60)+' min' : duration+' sec'}` : '';
          let text = "";
          if(status==="completed") text = `Group ${callType} call · ${durText || "0 sec"}`;
          else if(status==="missed") text = `Missed group ${callType} call`;
          else if(status==="rejected") text = `Rejected group ${callType} call`;
          else text = `Group ${callType} call · ${status}`;
          g.messages.push({ senderId: new Types.ObjectId(caller), text, messageType:"call", callId, callType, callStatus: status, callDuration: duration, createdAt: new Date() } as any);
          await g.save();
        }
        try{
          const io=getIO();
          const { onlineUsers } = await import("../../socket");
          // broadcast to all group members
          for(const mem of g.members){
            const mid = mem.toString();
            const sid = onlineUsers.get(mid);
            if(sid) io.to(sid).emit("group-message", { groupId, message: g.messages[g.messages.length-1] });
          }
        }catch{}
        return;
      }catch(e){ console.error("group createCallMessage error", e); return; }
    }
    // Avoid duplicate call message per callId
    const existingMsg = await MessageModal.findOne({ callId, messageType: "call" });
    if(existingMsg){
      existingMsg.callStatus = status as any;
      existingMsg.callDuration = duration;
      existingMsg.callType = callType as any;
      await existingMsg.save();
      // emit update to both participants so UI refreshes text if status changes
      try{
        const io=getIO();
        const { onlineUsers } = await import("../../socket");
        const s=onlineUsers.get(caller); const r=onlineUsers.get(receiver);
        const payload = existingMsg.toObject();
        if(s) io.to(s).emit("new-message", { message: payload });
        if(r) io.to(r).emit("new-message", { message: payload });
      }catch{}
      return existingMsg;
    }
    const cid = callId || `${caller}_${receiver}_${Date.now()}`;
    const chatId = getChatId(caller, receiver);
    // Human readable text fallback
    const durText = duration ? `${Math.floor(duration/60)>0 ? Math.floor(duration/60)+' min' : duration+' sec'}` : '';
    let text = "";
    if(status==="completed") text = `${callType} call · ${durText || "0 sec"}`;
    else if(status==="missed") text = `Missed ${callType} call`;
    else if(status==="rejected") text = `Rejected ${callType} call`;
    else if(status==="cancelled") text = `Cancelled ${callType} call`;
    else text = `${callType} call · ${status}`;
    const msg = await MessageModal.create({
      chatId,
      senderId: new Types.ObjectId(caller),
      receiverId: new Types.ObjectId(receiver),
      text,
      messageType: "call",
      callId: cid,
      callType,
      callStatus: status as any,
      callDuration: duration,
      status: "sent",
    } as any);
    try{
      const io=getIO();
      const { onlineUsers } = await import("../../socket");
      const s=onlineUsers.get(caller); const r=onlineUsers.get(receiver);
      const payload = (msg as any).toObject ? (msg as any).toObject() : msg;
      if(s) io.to(s).emit("new-message", { message: payload });
      if(r) io.to(r).emit("new-message", { message: payload });
    }catch{}
    return msg;
  }catch(e){ console.error("createCallMessage error", e); }
};

export const getGlobalHistory = async (req:Request,res:Response)=>{
  try{
    const userId=req.user?.userId;
    const page=parseInt(req.query.page as string)||1;
    const limit=20;
    const skip=(page-1)*limit;
    // Include direct and group calls where user is member
    const { default: GroupChat } = await import("../../models/groupChat.model");
    const userGroups:any = await GroupChat.find({ members: userId }).select("_id").lean();
    const groupIds = userGroups.map((g:any)=> g._id);
    const or:any[] = [{ caller: userId }, { receiver: userId }];
    if(groupIds.length>0) or.push({ groupId: { $in: groupIds }, isGroupCall: true });
    const histories=await CallHistory.find({ $or: or })
      .populate("caller","username avatar")
      .populate("receiver","username avatar")
      .populate("groupId","name avatar")
      .sort({createdAt:-1}).skip(skip).limit(limit).lean();
    const mapped=histories.map((h:any)=>{
      const isGroup = !!h.isGroupCall && !!h.groupId;
      if(isGroup){
        const group = h.groupId;
        const isOutgoing = h.caller?._id ? h.caller._id.toString()===userId : h.caller.toString()===userId;
        return {
          _id:h._id,
          other: group || { username: "Group", avatar: "" },
          groupId: h.groupId,
          isGroupCall: true,
          callType:h.callType,
          status:h.status,
          direction: isOutgoing ? "outgoing" : "incoming",
          startTime:h.startTime,
          endTime:h.endTime,
          duration:h.duration,
          createdAt:h.createdAt,
        };
      }
      const callerId = h.caller?._id ? h.caller._id.toString() : h.caller.toString();
      const isOutgoing=callerId===userId;
      const other=isOutgoing ? h.receiver : h.caller;
      return {
        _id:h._id,
        other,
        callType:h.callType,
        status:h.status,
        direction: isOutgoing ? "outgoing" : "incoming",
        startTime:h.startTime,
        endTime:h.endTime,
        duration:h.duration,
        createdAt:h.createdAt,
      };
    });
    return res.json({success:true, history: mapped, hasMore: histories.length===limit});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const getChatHistory = async (req:Request,res:Response)=>{
  try{
    const userId=req.user?.userId;
    const otherId=req.params.userId;
    if(!Types.ObjectId.isValid(otherId)) return res.status(400).json({success:false,msg:"Invalid user"});
    const page=parseInt(req.query.page as string)||1;
    const limit=20;
    const skip=(page-1)*limit;
    // Check if otherId is a group the user belongs to
    try{
      const { default: GroupChat } = await import("../../models/groupChat.model");
      const grp:any = await GroupChat.findOne({ _id: otherId, members: userId }).lean();
      if(grp){
        const histories=await CallHistory.find({ groupId: otherId, isGroupCall: true }).sort({createdAt:-1}).skip(skip).limit(limit).lean();
        const mapped=histories.map((h:any)=>{
          const callerId = h.caller?._id ? h.caller._id.toString() : h.caller.toString();
          const isOutgoing=callerId===userId;
          return {
            _id:h._id,
            callType:h.callType,
            status:h.status,
            direction: isOutgoing ? "outgoing" : "incoming",
            isGroupCall: true,
            groupId: h.groupId,
            startTime:h.startTime,
            endTime:h.endTime,
            duration:h.duration,
            createdAt:h.createdAt,
          };
        });
        return res.json({success:true, history: mapped});
      }
    }catch{}
    const histories=await CallHistory.find({
      $or: [
        { caller: userId, receiver: otherId },
        { caller: otherId, receiver: userId }
      ]
    }).sort({createdAt:-1}).skip(skip).limit(limit).lean();
    const mapped=histories.map((h:any)=>{
      const callerId = h.caller?._id ? h.caller._id.toString() : h.caller.toString();
      const isOutgoing=callerId===userId;
      return {
        _id:h._id,
        callType:h.callType,
        status:h.status,
        direction: isOutgoing ? "outgoing" : "incoming",
        startTime:h.startTime,
        endTime:h.endTime,
        duration:h.duration,
        createdAt:h.createdAt,
      };
    });
    return res.json({success:true, history: mapped});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
