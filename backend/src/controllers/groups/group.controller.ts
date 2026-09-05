import { Request, Response } from "express";
import GroupChatModel from "../../models/groupChat.model";
import UserMOdel from "../../models/user.model";
import { getIO } from "../../socketEmitter";
import { onlineUsers, userSockets } from "../../socket";
import cloudinary from "../../libs/cloudinary";

function emitToMembers(members:any[], event:string, payload:any){
  try{
    const io=getIO();
    for(const m of members){
      const mid = (m?._id ? m._id : m)?.toString?.() || m?.toString?.();
      if(!mid) continue;
      const set = userSockets.get(mid);
      if(set && set.size>0){ for(const sid of set) io.to(sid).emit(event, payload); continue; }
      const sid = onlineUsers.get(mid);
      if(sid) io.to(sid).emit(event, payload);
    }
    if(payload?.groupId) io.to(payload.groupId.toString()).emit(event, payload);
  }catch{}
}
function emitToGroupRoom(groupId:string, event:string, payload:any){
  try{
    const io=getIO();
    io.to(groupId.toString()).emit(event, payload);
    // also direct to members for offline room join fallback
    // caller should also call emitToMembers
  }catch{}
}

export const createGroup = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, description, members } = req.body;
    let memberIds: string[] = [];
    if (typeof members === "string") { try { memberIds = JSON.parse(members); } catch { memberIds = []; } }
    else if (Array.isArray(members)) memberIds = members;
    if (!name || !name.trim()) return res.status(400).json({ success: false, msg: "Group name required" });
    if (name.length > 100) return res.status(400).json({ success: false, msg: "Name too long" });
    // Validate members are friends
    const creator = await UserMOdel.findById(userId);
    if (!creator) return res.status(404).json({ success: false, msg: "User not found" });
    for (const mid of memberIds) {
      const isFriend = creator.friends.some((f: any) => f.toString() === mid);
      if (!isFriend) return res.status(400).json({ success: false, msg: `User ${mid} is not your friend` });
    }
    let avatarUrl: string | undefined;
    if ((req as any).file) {
      const file = (req as any).file;
      const b64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const up: any = await cloudinary.uploader.upload(b64, { folder: "group-avatars" });
      avatarUrl = up.secure_url;
    }
    const allMembers = [...new Set([userId, ...memberIds])];
    const group = await (GroupChatModel as any).create({
      name: name.trim(),
      description,
      avatar: avatarUrl,
      members: allMembers,
      admins: [userId],
      createdBy: userId,
      messages: [],
      pinnedMessages: [],
    });
    // notify members via socket (fixed: use onlineUsers map + group room)
    emitToMembers(allMembers as any, "group-member-added", { groupId: (group as any)._id });
    emitToGroupRoom((group as any)._id.toString(), "group-member-added", { groupId: (group as any)._id });
    return res.status(201).json({ success: true, group });
  } catch (e) { console.error(e); return res.status(500).json({ success: false, msg: "Internal error" }); }
};

export const getMyGroups = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    let groups = await GroupChatModel.find({ members: userId }).sort({ updatedAt: -1 }).populate("members", "username avatar").lean();
    try{
      const user:any = await UserMOdel.findById(userId).select("deletedChats");
      const deletedSet=new Set((user?.deletedChats||[]).map((d:any)=> d.chatId));
      groups=groups.filter((g:any)=> !deletedSet.has(g._id.toString()));
    }catch{}
    // attach lastMessage preview (text/file/sender) for UI list under group name
    const enriched = groups.map((g:any)=>{
      const msgs = g.messages || [];
      let lastMessage:any = null;
      if(msgs.length>0){
        // find last non-deleted visible for this user
        for(let i=msgs.length-1;i>=0;i--){
          const m=msgs[i];
          if(m.deletedFor?.includes(userId)) continue;
          if(m.isDeleted) continue;
          lastMessage = { text: m.text, file: m.file, senderId: m.senderId, createdAt: m.createdAt, mimeType: m.mimeType };
          break;
        }
      }
      return { ...g, lastMessage, messages: undefined };
    });
    return res.json({ success: true, groups: enriched });
  } catch (e) { return res.status(500).json({ success: false, msg: "Internal error" }); }
};

export const getGroupDetails = async (req: Request, res: Response) => {
  try { const g = (req as any).group; if (!g) return res.status(404).json({ success:false, msg:"Not found"}); await g.populate("members", "username avatar firstName lastName isOnline"); await g.populate("admins", "username"); return res.json({ success:true, group:g}); } catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const updateGroup = async (req: Request, res: Response) => {
  try {
    const g = (req as any).group;
    if (!(req as any).isGroupAdmin) return res.status(403).json({success:false, msg:"Admin only"});
    const { name, description, removeAvatar } = req.body;
    if (name) g.name = name.trim();
    if (description !== undefined) g.description = description;
    if (removeAvatar === "true" || removeAvatar === true) {
      g.avatar = undefined;
    } else if ((req as any).file) {
      const file=(req as any).file;
      if(!file.mimetype.startsWith("image/")) return res.status(400).json({success:false, msg:"Only image allowed"});
      if(file.size > 5*1024*1024) return res.status(400).json({success:false, msg:"Image too large, max 5MB"});
      const b64=`data:${file.mimetype};base64,${file.buffer.toString("base64")}`; const up:any=await cloudinary.uploader.upload(b64,{folder:"group-avatars"}); g.avatar=up.secure_url;
    }
    await g.save();
    await g.populate("members","username avatar");
    emitToMembers(g.members as any, "group-settings-updated",{groupId:g._id, settings:{name:g.name, avatar:g.avatar, description:g.description}});
    emitToGroupRoom(g._id.toString(), "group-settings-updated",{groupId:g._id, settings:{name:g.name, avatar:g.avatar, description:g.description}});
    return res.json({success:true, group:g});
  } catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const leaveGroup = async (req: Request, res: Response) => {
  try {
    const userId=req.user?.userId; const g=(req as any).group;
    g.members = g.members.filter((m:any)=> m.toString()!==userId);
    g.admins = g.admins.filter((a:any)=> a.toString()!==userId);
    if (g.members.length===0) { await GroupChatModel.findByIdAndDelete(g._id); return res.json({success:true, msg:"Group deleted"}); }
    if (g.admins.length===0 && g.members.length>0) { g.admins.push(g.members[0]); }
    await g.save();
    emitToMembers([...g.members, userId] as any, "group-member-removed",{groupId:g._id, memberId:userId});
    emitToGroupRoom(g._id.toString(), "group-member-removed",{groupId:g._id, memberId:userId});
    return res.json({success:true, msg:"Left group"});
  } catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const addMember = async (req: Request, res: Response)=>{
  try{
    const g=(req as any).group; if(!(req as any).isGroupAdmin) return res.status(403).json({success:false,msg:"Admin only"});
    const { memberId }=req.body; if(!memberId) return res.status(400).json({success:false,msg:"memberId required"});
    if(g.members.some((m:any)=> m.toString()===memberId)) return res.status(409).json({success:false,msg:"Already member"});
    const requester=await UserMOdel.findById(req.user?.userId);
    const isFriend=requester?.friends.some((f:any)=> f.toString()===memberId);
    if(!isFriend) return res.status(400).json({success:false,msg:"Can only add friends"});
    g.members.push(memberId); await g.save();
    emitToMembers(g.members as any, "group-member-added",{groupId:g._id, memberId});
    emitToGroupRoom(g._id.toString(), "group-member-added",{groupId:g._id, memberId});
    return res.json({success:true, group:g});
  }catch(e){return res.status(500).json({success:false,msg:"error"});}
};

export const removeMember = async (req: Request, res: Response)=>{
  try{
    const g=(req as any).group; if(!(req as any).isGroupAdmin) return res.status(403).json({success:false,msg:"Admin only"});
    const memberId=req.params.memberId; g.members=g.members.filter((m:any)=> m.toString()!==memberId); g.admins=g.admins.filter((a:any)=> a.toString()!==memberId); if(g.members.length===0){ await GroupChatModel.findByIdAndDelete(g._id); return res.json({success:true,msg:"Group deleted"});} if(g.admins.length===0) g.admins.push(g.members[0]); await g.save();
    emitToMembers([...g.members, memberId] as any, "group-member-removed",{groupId:g._id, memberId});
    emitToGroupRoom(g._id.toString(), "group-member-removed",{groupId:g._id, memberId});
    return res.json({success:true, group:g});
  }catch(e){return res.status(500).json({success:false,msg:"error"});}
};

export const promoteToAdmin = async (req:Request,res:Response)=>{
  try{
    const g=(req as any).group; if(!(req as any).isGroupAdmin) return res.status(403).json({success:false,msg:"Admin only"});
    const memberId=req.params.memberId; if(!g.members.some((m:any)=> m.toString()===memberId)) return res.status(400).json({success:false,msg:"Not a member"});
    if(g.admins.some((a:any)=> a.toString()===memberId)) return res.status(409).json({success:false,msg:"Already admin"});
    g.admins.push(memberId); await g.save();
    emitToMembers(g.members as any, "group-admin-promoted",{groupId:g._id, memberId});
    emitToGroupRoom(g._id.toString(), "group-admin-promoted",{groupId:g._id, memberId});
    return res.json({success:true, group:g});
  }catch(e){return res.status(500).json({success:false,msg:"error"});}
};

export const demoteAdmin = async (req:Request,res:Response)=>{
  try{
    const g=(req as any).group; if(!(req as any).isGroupAdmin) return res.status(403).json({success:false,msg:"Admin only"});
    const memberId=req.params.memberId; if(g.admins.length<=1) return res.status(400).json({success:false,msg:"Must have at least one admin"});
    g.admins=g.admins.filter((a:any)=> a.toString()!==memberId); await g.save();
    emitToMembers(g.members as any, "group-admin-demoted",{groupId:g._id, memberId});
    emitToGroupRoom(g._id.toString(), "group-admin-demoted",{groupId:g._id, memberId});
    return res.json({success:true, group:g});
  }catch(e){return res.status(500).json({success:false,msg:"error"});}
};

export const getGroupMessages = async (req:Request,res:Response)=>{
  try{
    const g=(req as any).group; const page=parseInt(req.query.page as string)||1; const limit=20; const skip=(page-1)*limit;
    let messages=g.messages.slice().sort((a:any,b:any)=> b.createdAt.getTime()-a.createdAt.getTime()).slice(skip, skip+limit).reverse();
    // Populate sender info for each message
    try{
      const senderIds:any[]=[...new Set(messages.map((m:any)=> m.senderId?.toString()).filter(Boolean))];
      if(senderIds.length>0){
        const users:any = await UserMOdel.find({_id: {$in: senderIds as any}}).select("username avatar firstName lastName").lean();
        const map=new Map(users.map((u:any)=> [u._id.toString(), u]));
        messages=messages.map((m:any)=>{
          const obj = typeof m.toObject === 'function' ? m.toObject() : {...m};
          const sender = map.get(m.senderId.toString());
          if(sender) obj.senderId = sender;
          return obj;
        });
      }
    }catch{}
    return res.json({success:true, messages, hasMore: g.messages.length > skip+limit});
  }catch(e){return res.status(500).json({success:false,msg:"error"});}
};

export const sendGroupMessage = async (req:Request,res:Response)=>{
  try{
    const g=(req as any).group; const userId=req.user?.userId; const { text, clientId, replyTo }=req.body;
    let fileUrl; let mimeType;
    if((req as any).file){ const file=(req as any).file; mimeType=file.mimetype; const b64=`data:${file.mimetype};base64,${file.buffer.toString("base64")}`; const folder=mimeType.startsWith("image/")?"chat-images":mimeType.startsWith("video/")?"chat-videos":mimeType.startsWith("audio/")?"chat-audio":"chat-files"; const up:any=await cloudinary.uploader.upload(b64,{folder}); fileUrl=up.secure_url; }
    if(!text && !fileUrl) return res.status(400).json({success:false,msg:"Message empty"});
    let expiresAt: Date | undefined;
    if((g as any).disappearingDuration){
      const map:any={"24h":24*60*60*1000,"7d":7*24*60*60*1000,"90d":90*24*60*60*1000};
      const ms=map[(g as any).disappearingDuration]; if(ms) expiresAt=new Date(Date.now()+ms);
    }
    const msg:any={ senderId:userId, text, file:fileUrl, mimeType, clientId, replyTo: replyTo||undefined, reactions:[], isDeleted:false, deletedFor:[], status:"sent", isEdited:false, editHistory:[], expiresAt};
    g.messages.push(msg); await g.save(); const rawSaved:any=g.messages[g.messages.length-1];
    // populate sender for realtime display (username not ID)
    let populated:any = rawSaved;
    try{
      const sender:any = await UserMOdel.findById(userId).select("username avatar firstName lastName").lean();
      const obj = typeof rawSaved.toObject === 'function' ? rawSaved.toObject() : {...rawSaved};
      if(sender) obj.senderId = sender;
      populated = obj;
    }catch{}
    emitToMembers(g.members as any, "group-message",{groupId:g._id, message:populated});
    emitToGroupRoom(g._id.toString(), "group-message",{groupId:g._id, message:populated});
    return res.status(201).json({success:true, message:populated});
  }catch(e){ console.error(e); return res.status(500).json({success:false,msg:"error"});}
};

export const deleteGroupMessage = async (req:Request,res:Response)=>{
  try{
    const g=(req as any).group; const messageId=req.params.messageId; const userId=req.user?.userId;
    const msg=g.messages.id(messageId); if(!msg) return res.status(404).json({success:false,msg:"Message not found"});
    if(msg.senderId.toString()!==userId && !(req as any).isGroupAdmin) return res.status(403).json({success:false,msg:"Not allowed"});
    msg.isDeleted=true; msg.text=""; msg.file=""; await g.save();
    emitToMembers(g.members as any, "message-deleted",{groupId:g._id, messageId});
    emitToGroupRoom(g._id.toString(), "message-deleted",{groupId:g._id, messageId});
    return res.json({success:true, msg:"Deleted"});
  }catch(e){return res.status(500).json({success:false,msg:"error"});}
};

export const deleteGroupMessageForMe = async (req:Request,res:Response)=>{
  try{
    const g=(req as any).group; const messageId=req.params.messageId; const userId=req.user?.userId;
    const msg=g.messages.id(messageId); if(!msg) return res.status(404).json({success:false,msg:"Message not found"});
    if(!msg.deletedFor.includes(userId)){
      msg.deletedFor.push(userId);
      await g.save();
    }
    {
      const io=getIO();
      const set:any = userSockets.get(userId as string);
      if(set && set.size>0){ for(const sid of set) io.to(sid).emit("message-deleted",{groupId:g._id, messageId, forMe:true, deletedFor: msg.deletedFor}); }
      else { const sid=onlineUsers.get(userId as string); if(sid) io.to(sid).emit("message-deleted",{groupId:g._id, messageId, forMe:true, deletedFor: msg.deletedFor}); }
    }
    return res.json({success:true, msg:"Deleted for me"});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const editGroupMessage = async (req:Request,res:Response)=>{
  try{
    const g=(req as any).group; const messageId=req.params.messageId; const { text }=req.body; const userId=req.user?.userId;
    const msg=g.messages.id(messageId); if(!msg) return res.status(404).json({success:false,msg:"Not found"});
    if(msg.senderId.toString()!==userId) return res.status(403).json({success:false,msg:"Only sender can edit"});
    const fifteen=15*60*1000; if(Date.now()- new Date(msg.createdAt).getTime() > fifteen) return res.status(400).json({success:false,msg:"Edit window expired"});
    msg.editHistory.push({originalText: msg.text, editedAt: new Date()}); msg.text=text; msg.isEdited=true; msg.editedAt=new Date(); await g.save();
    emitToMembers(g.members as any, "message-edited",{groupId:g._id, messageId, newText:text});
    emitToGroupRoom(g._id.toString(), "message-edited",{groupId:g._id, messageId, newText:text});
    return res.json({success:true, message:msg});
  }catch(e){return res.status(500).json({success:false,msg:"error"});}
};

export const reactToGroupMessage = async (req:Request,res:Response)=>{
  try{
    const g=(req as any).group; const messageId=req.params.messageId; const { emoji }=req.body; const userId=req.user?.userId;
    const msg=g.messages.id(messageId); if(!msg) return res.status(404).json({success:false,msg:"Not found"});
    msg.reactions = msg.reactions.filter((r:any)=> r.userId.toString()!==userId);
    if(emoji) msg.reactions.push({emoji, userId}); await g.save();
    emitToMembers(g.members as any, "message-reaction",{groupId:g._id, messageId, reactions:msg.reactions});
    emitToGroupRoom(g._id.toString(), "message-reaction",{groupId:g._id, messageId, reactions:msg.reactions});
    return res.json({success:true, reactions:msg.reactions});
  }catch(e){return res.status(500).json({success:false,msg:"error"});}
};

export const pinMessage = async (req:Request,res:Response)=>{
  try{
    const g=(req as any).group; if(!(req as any).isGroupAdmin) return res.status(403).json({success:false,msg:"Admin only"});
    const messageId=req.params.messageId; if(g.pinnedMessages.length>=3) return res.status(400).json({success:false,msg:"Max 3 pinned"});
    if(g.pinnedMessages.some((p:any)=> p.messageId.toString()===messageId)) return res.status(409).json({success:false,msg:"Already pinned"});
    g.pinnedMessages.push({messageId, pinnedBy:req.user?.userId, pinnedAt:new Date()}); await g.save();
    emitToMembers(g.members as any, "message-pinned",{groupId:g._id, messageId});
    emitToGroupRoom(g._id.toString(), "message-pinned",{groupId:g._id, messageId});
    return res.json({success:true, pinned:g.pinnedMessages});
  }catch(e){return res.status(500).json({success:false,msg:"error"});}
};

export const unpinMessage = async (req:Request,res:Response)=>{
  try{
    const g=(req as any).group; if(!(req as any).isGroupAdmin) return res.status(403).json({success:false,msg:"Admin only"});
    const messageId=req.params.messageId; g.pinnedMessages=g.pinnedMessages.filter((p:any)=> p.messageId.toString()!==messageId); await g.save();
    emitToMembers(g.members as any, "message-unpinned",{groupId:g._id, messageId});
    emitToGroupRoom(g._id.toString(), "message-unpinned",{groupId:g._id, messageId});
    return res.json({success:true, pinned:g.pinnedMessages});
  }catch(e){return res.status(500).json({success:false,msg:"error"});}
};

export const getPinnedMessages = async (req:Request,res:Response)=>{
  try{ const g=(req as any).group; return res.json({success:true, pinned:g.pinnedMessages}); }catch(e){return res.status(500).json({success:false,msg:"error"});}
};
