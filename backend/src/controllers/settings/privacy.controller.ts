import { Request, Response } from "express";
import { PrivacySettings } from "../../models/privacySettings.model";
import UserMOdel from "../../models/user.model";

export const getPrivacySettings = async (req:Request,res:Response)=>{
  try{
    let ps=await PrivacySettings.findOne({userId:req.user?.userId});
    if(!ps) ps=await PrivacySettings.create({userId:req.user?.userId});
    return res.json({success:true, settings:ps});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const updatePrivacySettings = async (req:Request,res:Response)=>{
  try{
    const allowed=["everyone","friends","nobody"];
    const allowEvery=["everyone","friends"];
    const {lastSeenVisibility, onlineStatusVisibility, profilePhotoVisibility, statusVisibility, readReceiptEnabled, allowMessagesFrom, allowGroupInvitesFrom}=req.body;
    if(lastSeenVisibility && !allowed.includes(lastSeenVisibility)) return res.status(400).json({success:false,msg:"Invalid lastSeenVisibility"});
    if(onlineStatusVisibility && !allowed.includes(onlineStatusVisibility)) return res.status(400).json({success:false,msg:"Invalid onlineStatusVisibility"});
    if(profilePhotoVisibility && !allowed.includes(profilePhotoVisibility)) return res.status(400).json({success:false,msg:"Invalid profilePhotoVisibility"});
    if(statusVisibility && !allowed.includes(statusVisibility)) return res.status(400).json({success:false,msg:"Invalid statusVisibility"});
    if(allowMessagesFrom && !allowEvery.includes(allowMessagesFrom)) return res.status(400).json({success:false,msg:"Invalid allowMessagesFrom"});
    if(allowGroupInvitesFrom && !allowEvery.includes(allowGroupInvitesFrom)) return res.status(400).json({success:false,msg:"Invalid allowGroupInvitesFrom"});
    let ps=await PrivacySettings.findOne({userId:req.user?.userId});
    if(!ps) ps=await PrivacySettings.create({userId:req.user?.userId});
    if(lastSeenVisibility) ps.lastSeenVisibility=lastSeenVisibility;
    if(onlineStatusVisibility) ps.onlineStatusVisibility=onlineStatusVisibility;
    if(profilePhotoVisibility) ps.profilePhotoVisibility=profilePhotoVisibility;
    if(statusVisibility) ps.statusVisibility=statusVisibility;
    if(typeof readReceiptEnabled==="boolean") ps.readReceiptEnabled=readReceiptEnabled;
    if(allowMessagesFrom) ps.allowMessagesFrom=allowMessagesFrom;
    if(allowGroupInvitesFrom) ps.allowGroupInvitesFrom=allowGroupInvitesFrom;
    await ps.save();
    return res.json({success:true, settings:ps});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const blockUser = async (req:Request,res:Response)=>{
  try{ const userId=req.user?.userId; const target=req.params.userId; const user=await UserMOdel.findById(userId); if(!user) return res.status(404).json({success:false,msg:"User not found"}); if(!user.blockedUsers.some((id:any)=> id.toString()===target)){ user.blockedUsers.push(target as any); user.friends=user.friends.filter((id:any)=> id.toString()!==target); await user.save(); const other=await UserMOdel.findById(target); if(other){ other.friends=other.friends.filter((id:any)=> id.toString()!==userId); await other.save(); } } return res.json({success:true, msg:"Blocked"}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const unblockUser = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId); if(!user) return res.status(404).json({success:false,msg:"Not found"}); user.blockedUsers=user.blockedUsers.filter((id:any)=> id.toString()!==req.params.userId); await user.save(); return res.json({success:true, msg:"Unblocked"}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const getBlockedUsers = async (req:Request,res:Response)=>{
  try{ const user=await UserMOdel.findById(req.user?.userId).populate("blockedUsers","username avatar email"); return res.json({success:true, blocked:user?.blockedUsers||[]}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
