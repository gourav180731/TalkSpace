import { Request, Response } from "express";
import UserSettings from "../../models/userSettings.model";
import Feedback from "../../models/feedback.model";
import cloudinary from "../../libs/cloudinary";

export const getUserSettings = async (req:Request,res:Response)=>{
  try{ let s=await UserSettings.findOne({userId:req.user?.userId}); if(!s) s=await UserSettings.create({userId:req.user?.userId}); return res.json({success:true, settings:s}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const updateUserSettings = async (req:Request,res:Response)=>{
  try{
    let s=await UserSettings.findOne({userId:req.user?.userId}); if(!s) s=await UserSettings.create({userId:req.user?.userId});
    const fields=["pushNotificationsEnabled","soundEnabled","vibrationEnabled","enterToSend","fontSize","autoDownloadMedia","theme","glassmorphicIntensity","audioQuality","videoQuality","keepChatsArchived","mediaVisibility","stickerSuggestions","voiceTranscriptEnabled","securityNotifications","twoStepEnabled","language"];
    for(const f of fields){ if(req.body[f]!==undefined) (s as any)[f]=req.body[f]; }
    // Validate language
    if(req.body.language && !["en","hi","mr","gu","ta","bn","te","kn","ml","pa","ur"].includes(req.body.language)) return res.status(400).json({success:false,msg:"Unsupported language"});
    await s.save();
    // Emit realtime sync to other sessions
    try{ const { getIO } = await import("../../socketEmitter"); const { onlineUsers } = await import("../../socket"); const io=getIO(); const uid=req.user?.userId as string; if(uid){ const sid=onlineUsers.get(uid); if(sid) io.to(sid).emit("settings-updated", { settings: s }); }}catch{}
    return res.json({success:true, settings:s});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const setChatWallpaper = async (req:Request,res:Response)=>{
  try{
    const chatId=req.params.chatId; let wallpaper;
    if((req as any).file){ const file=(req as any).file; const b64=`data:${file.mimetype};base64,${file.buffer.toString("base64")}`; const up:any=await cloudinary.uploader.upload(b64,{folder:"wallpapers"}); wallpaper={type:"custom", value:up.secure_url}; } else if(req.body.wallpaper){ const v=req.body.wallpaper; wallpaper= typeof v==="string"? JSON.parse(v): v; }
    if(!wallpaper) return res.status(400).json({success:false,msg:"wallpaper required"});
    let s=await UserSettings.findOne({userId:req.user?.userId}); if(!s) s=await UserSettings.create({userId:req.user?.userId});
    const idx=s.chatCustomizations.findIndex(c=> c.chatId===chatId);
    if(idx>=0) s.chatCustomizations[idx].wallpaper=wallpaper; else s.chatCustomizations.push({chatId, wallpaper} as any);
    await s.save(); return res.json({success:true, settings:s});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const setChatTheme = async (req:Request,res:Response)=>{
  try{
    const chatId=req.params.chatId; const theme=req.body.theme || req.body;
    let s=await UserSettings.findOne({userId:req.user?.userId}); if(!s) s=await UserSettings.create({userId:req.user?.userId});
    const idx=s.chatCustomizations.findIndex(c=> c.chatId===chatId);
    if(idx>=0) s.chatCustomizations[idx].theme=theme; else s.chatCustomizations.push({chatId, theme} as any);
    await s.save(); return res.json({success:true, settings:s});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const clearMediaCache = async (req:Request,res:Response)=>{
  try{ let s=await UserSettings.findOne({userId:req.user?.userId}); if(!s) s=await UserSettings.create({userId:req.user?.userId}); s.mediaCacheSize=0; s.lastCacheClear=new Date(); await s.save(); return res.json({success:true, settings:s}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const submitFeedback = async (req:Request,res:Response)=>{
  try{
    const { message, category } = req.body;
    if(!message || !message.trim()) return res.status(400).json({success:false,msg:"Message required"});
    if(message.length>2000) return res.status(400).json({success:false,msg:"Message too long"});
    const fb=await Feedback.create({ userId: req.user?.userId, message: message.trim(), category: category||"general" });
    return res.json({success:true, feedback: fb});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const getNetworkUsage = async (req:Request,res:Response)=>{
  try{
    let s=await UserSettings.findOne({userId:req.user?.userId});
    if(!s) s=await UserSettings.create({userId:req.user?.userId});
    // Application-level network usage (real cache size + message count)
    const { default: MessageModal } = await import("../../models/message.model");
    const count=await MessageModal.countDocuments({ $or: [{senderId:req.user?.userId},{receiverId:req.user?.userId}] });
    return res.json({success:true, usage: { mediaCacheSize: s.mediaCacheSize, lastCacheClear: s.lastCacheClear, messageCount: count }});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
