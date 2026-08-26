import { Request, Response } from "express";
import UserSettings from "../../models/userSettings.model";
import cloudinary from "../../libs/cloudinary";

export const getUserSettings = async (req:Request,res:Response)=>{
  try{ let s=await UserSettings.findOne({userId:req.user?.userId}); if(!s) s=await UserSettings.create({userId:req.user?.userId}); return res.json({success:true, settings:s}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const updateUserSettings = async (req:Request,res:Response)=>{
  try{
    let s=await UserSettings.findOne({userId:req.user?.userId}); if(!s) s=await UserSettings.create({userId:req.user?.userId});
    const fields=["pushNotificationsEnabled","soundEnabled","vibrationEnabled","enterToSend","fontSize","autoDownloadMedia","theme","glassmorphicIntensity","audioQuality","videoQuality"];
    for(const f of fields){ if(req.body[f]!==undefined) (s as any)[f]=req.body[f]; }
    await s.save(); return res.json({success:true, settings:s});
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
