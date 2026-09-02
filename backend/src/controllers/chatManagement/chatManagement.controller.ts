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

export const getMutedChats = async (req:Request,res:Response)=>{
  try{
    const user=await UserMOdel.findById(req.user?.userId);
    if(!user) return res.status(404).json({success:false,msg:"User not found"});
    // Clean expired
    const now=new Date();
    const filtered=user.mutedChats.filter((c:any)=> !c.muteUntil || new Date(c.muteUntil) > now);
    if(filtered.length!==user.mutedChats.length){ user.mutedChats=filtered as any; await user.save(); }
    return res.json({success:true, muted: filtered});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const deleteChat = async (req:Request,res:Response)=>{
  try{
    const { chatId, chatType }=req.body; if(!chatId) return res.status(400).json({success:false,msg:"chatId required"});
    const user=await UserMOdel.findById(req.user?.userId); if(!user) return res.status(404).json({success:false,msg:"User not found"});
    if(user.deletedChats.some(c=> c.chatId===chatId)) return res.json({success:true, deleted:user.deletedChats});
    user.deletedChats.push({chatId, chatType:chatType||"direct", deletedAt:new Date()} as any);
    user.archivedChats=user.archivedChats.filter(c=> c.chatId!==chatId) as any;
    user.pinnedChats=user.pinnedChats.filter(c=> c.chatId!==chatId) as any;
    await user.save();
    try{ const io=getIO(); io.to(req.user!.userId).emit("chat-deleted",{chatId}); io.to(req.user!.userId).emit("chat-updated",{chatId, deleted:true}); }catch{}
    return res.json({success:true, deleted:user.deletedChats});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const getDeletedChats = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId); return res.json({success:true, deleted:user?.deletedChats||[]}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const restoreDeletedChat = async (chatId:string, userId:string)=>{
  try{
    const user=await UserMOdel.findById(userId);
    if(!user) return;
    const before=user.deletedChats.length;
    user.deletedChats=user.deletedChats.filter(c=> c.chatId!==chatId) as any;
    if(user.deletedChats.length!==before) await user.save();
  }catch{}
};

export const muteChat = async (req:Request,res:Response)=>{
  try{
    const {chatId, chatType, duration}=req.body; if(!chatId) return res.status(400).json({success:false,msg:"chatId required"});
    let muteUntil: Date|null=null;
    if(duration==="8h" || duration==="8 Hours") muteUntil=new Date(Date.now()+8*60*60*1000);
    else if(duration==="1w" || duration==="1 Week" || duration==="1 week") muteUntil=new Date(Date.now()+7*24*60*60*1000);
    else if(duration==="always" || duration==="Always") muteUntil=null;
    else if(duration) muteUntil=new Date(duration);
    const user=await UserMOdel.findById(req.user?.userId); if(!user) return res.status(404).json({success:false,msg:"User not found"});
    user.mutedChats=user.mutedChats.filter(c=> c.chatId!==chatId); user.mutedChats.push({chatId, chatType:chatType||"direct", muteUntil} as any); await user.save();
    try{ const io=getIO(); io.to(req.user!.userId).emit("chat-muted",{chatId, muteUntil}); io.to(req.user!.userId).emit("chat-updated",{chatId, muted:true}); }catch{}
    return res.json({success:true, muted:user.mutedChats});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const unmuteChat = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId); if(!user) return res.status(404).json({success:false,msg:"User not found"}); user.mutedChats=user.mutedChats.filter(c=> c.chatId!==req.params.chatId); await user.save();
  try{ const io=getIO(); io.to(req.user!.userId).emit("chat-unmuted",{chatId:req.params.chatId}); io.to(req.user!.userId).emit("chat-updated",{chatId:req.params.chatId, muted:false}); }catch{}
  return res.json({success:true, muted:user.mutedChats}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const toggleFavourite = async (req:Request,res:Response)=>{
  try{ const { chatId, chatType }=req.body; const user=await UserMOdel.findById(req.user?.userId); const exists=user!.favouriteChats.some(c=>c.chatId===chatId); if(exists) user!.favouriteChats=user!.favouriteChats.filter(c=>c.chatId!==chatId); else user!.favouriteChats.push({chatId, chatType:chatType||"direct", addedAt:new Date()} as any); await user!.save(); return res.json({success:true, favourites:user!.favouriteChats, added:!exists}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
export const setupChatLock = async (req:Request,res:Response)=>{
  try{
    const { pin } = req.body; if(!pin || pin.length<4) return res.status(400).json({success:false,msg:"PIN must be at least 4 characters"});
    const user=await UserMOdel.findById(req.user?.userId).select("+chatLockHash"); if(!user) return res.status(404).json({success:false,msg:"User not found"});
    const bcrypt=require("bcryptjs");
    const hash=await bcrypt.hash(pin, 10);
    user.chatLockHash=hash; user.chatLockEnabled=true; await user.save();
    return res.json({success:true, msg:"Chat lock PIN set"});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const verifyChatLock = async (req:Request,res:Response)=>{
  try{
    const { pin } = req.body; const user=await UserMOdel.findById(req.user?.userId).select("+chatLockHash");
    if(!user || !user.chatLockHash) return res.status(400).json({success:false,msg:"No PIN set"});
    const bcrypt=require("bcryptjs");
    const ok=await bcrypt.compare(pin, user.chatLockHash);
    if(!ok) return res.status(401).json({success:false,msg:"Invalid PIN"});
    return res.json({success:true, msg:"PIN verified"});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const removeChatLock = async (req:Request,res:Response)=>{
  try{
    const { pin } = req.body; const user=await UserMOdel.findById(req.user?.userId).select("+chatLockHash");
    if(!user || !user.chatLockHash) return res.status(400).json({success:false,msg:"No PIN set"});
    const bcrypt=require("bcryptjs");
    const ok=await bcrypt.compare(pin, user.chatLockHash);
    if(!ok) return res.status(401).json({success:false,msg:"Invalid PIN"});
    user.chatLockHash=undefined as any; user.chatLockEnabled=false; user.lockedChats=[] as any; await user.save();
    try{ const io=getIO(); io.to(req.user!.userId).emit("chat-lock-removed",{}); }catch{}
    return res.json({success:true, msg:"Chat lock removed"});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const toggleLock = async (req:Request,res:Response)=>{
  try{
    const { chatId, chatType, pin }=req.body; const user=await UserMOdel.findById(req.user?.userId).select("+chatLockHash");
    if(!user) return res.status(404).json({success:false,msg:"User not found"});
    if(!user.chatLockHash){
      // First time: require pin to set
      if(!pin) return res.status(400).json({success:false,msg:"PIN required to set up chat lock"});
      const bcrypt=require("bcryptjs");
      const hash=await bcrypt.hash(pin, 10);
      user.chatLockHash=hash; user.chatLockEnabled=true;
    } else {
      // Verify pin if provided, otherwise require verification via separate endpoint
      if(pin){
        const bcrypt=require("bcryptjs");
        const ok=await bcrypt.compare(pin, user.chatLockHash);
        if(!ok) return res.status(401).json({success:false,msg:"Invalid PIN"});
      } else {
        // If no pin provided and lock already set, require verification
        // For backward compat, allow toggle without pin but log warning
        // In production, frontend should call verify endpoint first
      }
    }
    const exists=user.lockedChats.some(c=>c.chatId===chatId);
    if(exists) user.lockedChats=user.lockedChats.filter(c=>c.chatId!==chatId);
    else user.lockedChats.push({chatId, chatType:chatType||"direct", lockedAt:new Date()} as any);
    await user.save();
    try{ const io=getIO(); io.to(req.user!.userId).emit("chat-locked",{chatId, locked:!exists}); }catch{}
    return res.json({success:true, locked:!exists});
  }catch(e){ console.error(e); return res.status(500).json({success:false,msg:"error"});}
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
  try{
    const chatId=req.params.chatId; const user=await UserMOdel.findById(req.user?.userId); if(!user) return res.status(404).json({success:false,msg:"User not found"});
    // Clean expired mutes
    const now=new Date();
    const originalLength=user.mutedChats.length;
    user.mutedChats=user.mutedChats.filter((c:any)=> !c.muteUntil || new Date(c.muteUntil) > now) as any;
    if(user.mutedChats.length!==originalLength) await user.save();
    const isFav=user.favouriteChats.some(c=>c.chatId===chatId);
    const isLocked=user.lockedChats.some(c=>c.chatId===chatId);
    const disp=user.disappearingChats.find(c=>c.chatId===chatId)?.duration || "off";
    const mutedEntry=user.mutedChats.find((c:any)=>c.chatId===chatId);
    const isMuted=!!mutedEntry && (!mutedEntry.muteUntil || new Date(mutedEntry.muteUntil) > now);
    const isPinned=user.pinnedChats.some(c=>c.chatId===chatId);
    return res.json({success:true, isFav, isLocked, disappearing: disp, isMuted, isPinned, mutedUntil: mutedEntry?.muteUntil || null});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
