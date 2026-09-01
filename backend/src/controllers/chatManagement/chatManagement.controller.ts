import { Request, Response } from "express";
import UserMOdel from "../../models/user.model";
import { getIO } from "../../socketEmitter";

export const pinChat = async (req:Request,res:Response)=>{
  try{
    const { chatId, chatType }=req.body; if(!chatId) return res.status(400).json({success:false,msg:"chatId required"});
    const user=await UserMOdel.findById(req.user?.userId); if(!user) return res.status(404).json({success:false,msg:"User not found"});
    if(user.pinnedChats.some(c=> c.chatId===chatId)) return res.status(409).json({success:false,msg:"Already pinned"});
    if(user.pinnedChats.length>=3) return res.status(400).json({success:false,msg:"Pin limit 3 reached"});
    user.pinnedChats.push({chatId, chatType: chatType||"direct", pinnedAt:new Date()} as any); await user.save();
    try{ const io=getIO(); io.to(req.user!.userId).emit("chat-pinned",{chatId}); }catch{}
    return res.json({success:true, pinned:user.pinnedChats});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const unpinChat = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId); user!.pinnedChats=user!.pinnedChats.filter(c=> c.chatId!==req.params.chatId); await user!.save(); return res.json({success:true, pinned:user!.pinnedChats}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const archiveChat = async (req:Request,res:Response)=>{
  try{
    const {chatId, chatType}=req.body; if(!chatId) return res.status(400).json({success:false,msg:"chatId required"});
    const user=await UserMOdel.findById(req.user?.userId); if(user!.archivedChats.some(c=> c.chatId===chatId)) return res.json({success:true, archived:user!.archivedChats});
    user!.archivedChats.push({chatId, chatType:chatType||"direct", archivedAt:new Date()} as any); await user!.save();
    return res.json({success:true, archived:user!.archivedChats});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const unarchiveChat = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId); user!.archivedChats=user!.archivedChats.filter(c=> c.chatId!==req.params.chatId); await user!.save(); return res.json({success:true, archived:user!.archivedChats}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const getArchivedChats = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId); return res.json({success:true, archived:user!.archivedChats}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const muteChat = async (req:Request,res:Response)=>{
  try{
    const {chatId, chatType, duration}=req.body; if(!chatId) return res.status(400).json({success:false,msg:"chatId required"});
    let muteUntil: Date|null=null;
    if(duration==="8h") muteUntil=new Date(Date.now()+8*60*60*1000);
    else if(duration==="1w") muteUntil=new Date(Date.now()+7*24*60*60*1000);
    else if(duration==="always") muteUntil=null;
    else if(duration) muteUntil=new Date(duration);
    const user=await UserMOdel.findById(req.user?.userId); user!.mutedChats=user!.mutedChats.filter(c=> c.chatId!==chatId); user!.mutedChats.push({chatId, chatType:chatType||"direct", muteUntil} as any); await user!.save();
    return res.json({success:true, muted:user!.mutedChats});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const unmuteChat = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId); user!.mutedChats=user!.mutedChats.filter(c=> c.chatId!==req.params.chatId); await user!.save(); return res.json({success:true, muted:user!.mutedChats}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const toggleFavourite = async (req:Request,res:Response)=>{
  try{ const { chatId, chatType }=req.body; const user=await UserMOdel.findById(req.user?.userId); const exists=user!.favouriteChats.some(c=>c.chatId===chatId); if(exists) user!.favouriteChats=user!.favouriteChats.filter(c=>c.chatId!==chatId); else user!.favouriteChats.push({chatId, chatType:chatType||"direct", addedAt:new Date()} as any); await user!.save(); return res.json({success:true, favourites:user!.favouriteChats, added:!exists}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
export const toggleLock = async (req:Request,res:Response)=>{
  try{ const { chatId, chatType }=req.body; const user=await UserMOdel.findById(req.user?.userId); const exists=user!.lockedChats.some(c=>c.chatId===chatId); if(exists) user!.lockedChats=user!.lockedChats.filter(c=>c.chatId!==chatId); else user!.lockedChats.push({chatId, chatType:chatType||"direct", lockedAt:new Date()} as any); await user!.save(); try{ const io=getIO(); io.to(req.user!.userId).emit("chat-locked",{chatId, locked:!exists}); }catch{} return res.json({success:true, locked:!exists}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
export const setDisappearing = async (req:Request,res:Response)=>{
  try{ const { chatId, chatType, duration }=req.body; // duration: "off"|"24h"|"7d"|"90d"
    if(chatType==="group"){
      const GroupChatModel=(await import("../../models/groupChat.model")).default; const g=await GroupChatModel.findById(chatId); if(g){ (g as any).disappearingDuration = duration==="off"? null: duration; await g.save(); try{ const io=getIO(); (g.members as any).forEach((m:any)=> io.to(m.toString()).emit("disappearing-updated",{chatId, duration})); }catch{} }
    } else {
      const user=await UserMOdel.findById(req.user?.userId); user!.disappearingChats=user!.disappearingChats.filter(c=>c.chatId!==chatId); if(duration!=="off") user!.disappearingChats.push({chatId, chatType:"direct", duration, enabledAt:new Date()} as any); await user!.save();
      try{ const io=getIO(); io.to(req.user!.userId).emit("disappearing-updated",{chatId, duration}); const other=chatId; const otherSock=(await import("../../socket")).onlineUsers.get(other); if(otherSock) io.to(otherSock).emit("disappearing-updated",{chatId:req.user!.userId, duration}); }catch{}
    }
    return res.json({success:true, duration});
  }catch(e){ console.error(e); return res.status(500).json({success:false,msg:"error"});}
};
export const addToList = async (req:Request,res:Response)=>{
  try{
    const { chatId, listName }=req.body; if(!chatId||!listName) return res.status(400).json({success:false,msg:"chatId and listName required"});
    const user=await UserMOdel.findById(req.user?.userId); if(!user) return res.status(404).json({success:false,msg:"User not found"});
    let list=user.chatLists.find(l=> l.name===listName);
    if(!list){ user.chatLists.push({ name:listName, chatIds:[chatId], createdAt:new Date()} as any); }
    else { if(!list.chatIds.includes(chatId)) list.chatIds.push(chatId); }
    await user.save();
    try{ const io=getIO(); io.to(req.user!.userId).emit("chat-list-updated",{ listName, chatId }); }catch{}
    return res.json({success:true, lists:user.chatLists});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
export const getLists = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId); return res.json({success:true, lists:user?.chatLists||[]}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
export const removeFromList = async (req:Request,res:Response)=>{
  try{ const { listName, chatId }=req.body; const user=await UserMOdel.findById(req.user?.userId); if(!user) return res.status(404).json({success:false,msg:"User not found"}); const list=user.chatLists.find(l=> l.name===listName); if(list){ list.chatIds=list.chatIds.filter((id:string)=> id!==chatId); await user.save(); } return res.json({success:true, lists:user.chatLists}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
export const toggleStarMessage = async (req:Request,res:Response)=>{
  try{ const { messageId, chatId }=req.body; if(!messageId||!chatId) return res.status(400).json({success:false,msg:"messageId and chatId required"});
    const user=await UserMOdel.findById(req.user?.userId); const exists=user!.starredMessages.some(s=> s.messageId===messageId);
    if(exists) user!.starredMessages=user!.starredMessages.filter(s=> s.messageId!==messageId);
    else user!.starredMessages.push({ messageId, chatId, starredAt:new Date()} as any);
    await user!.save();
    try{ const io=getIO(); io.to(req.user!.userId).emit("starred-updated",{ messageId, starred:!exists }); }catch{}
    return res.json({success:true, starred:!exists, starredMessages:user!.starredMessages});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
export const getStarredMessages = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId); return res.json({success:true, starred:user?.starredMessages||[]}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
export const scheduleCall = async (req:Request,res:Response)=>{
  try{
    const { chatId, chatType, scheduledAt }=req.body; if(!chatId||!scheduledAt) return res.status(400).json({success:false,msg:"chatId and scheduledAt required"});
    const user=await UserMOdel.findById(req.user?.userId); const callId=new Date().getTime().toString();
    user!.scheduledCalls.push({ callId, chatId, chatType:chatType||"direct", scheduledAt:new Date(scheduledAt), status:"scheduled"} as any);
    await user!.save();
    try{ const io=getIO(); io.to(req.user!.userId).emit("call-scheduled",{ callId, chatId, scheduledAt }); const otherSock=(await import("../../socket")).onlineUsers.get(chatId); if(otherSock) io.to(otherSock).emit("call-scheduled",{ callId, chatId:req.user!.userId, scheduledAt }); }catch{}
    return res.json({success:true, scheduled:user!.scheduledCalls});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
export const getScheduledCalls = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId); return res.json({success:true, scheduled:user?.scheduledCalls||[]}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
export const reportUser = async (req:Request,res:Response)=>{
  try{
    const { chatId, reason, messageId }=req.body; if(!chatId) return res.status(400).json({success:false,msg:"chatId required"});
    const ReportModel=(await import("../../models/report.model")).default;
    const report=await ReportModel.create({ reporter:req.user?.userId, reportedUser:chatId, reason:reason||"spam", messageId: messageId||undefined, chatId, status:"pending"});
    return res.json({success:true, report});
  }catch(e){ console.error(e); return res.status(500).json({success:false,msg:"error"});}
};
export const getChatSettings = async (req:Request,res:Response)=>{
  try{ const chatId=req.params.chatId; const user=await UserMOdel.findById(req.user?.userId);
    const isFav=user!.favouriteChats.some(c=>c.chatId===chatId);
    const isLocked=user!.lockedChats.some(c=>c.chatId===chatId);
    const disp=user!.disappearingChats.find(c=>c.chatId===chatId)?.duration || "off";
    const isMuted=user!.mutedChats.find(c=>c.chatId===chatId);
    const isPinned=user!.pinnedChats.some(c=>c.chatId===chatId);
    return res.json({success:true, isFav, isLocked, disappearing: disp, isMuted: !!isMuted, isPinned});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
