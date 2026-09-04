import { Request, Response } from "express";
import StatusUpdateModel from "../../models/statusUpdate.model";
import UserMOdel from "../../models/user.model";
import cloudinary from "../../libs/cloudinary";
import { getIO } from "../../socketEmitter";

export const createStatus = async (req:Request,res:Response)=>{
  try{
    const userId=req.user?.userId;
    const { textContent, backgroundColor, font, privacyMode, excludedFriends, includedFriends, contentType }=req.body;
    let type=contentType || "text";
    let mediaUrl;
    if((req as any).file){
      const file=(req as any).file;
      if(file.mimetype.startsWith("image/")) type="image"; else if(file.mimetype.startsWith("video/")) type="video";
      if(type==="video" && file.size > 50*1024*1024) return res.status(400).json({success:false,msg:"Video too large, max 50MB"});
      const b64=`data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      const up:any=await cloudinary.uploader.upload(b64,{folder:"status", resource_type: type==="video" ? "video" : "image"});
      // Validate video duration 2 minutes max (frontend also validates, backend enforces)
      if(type==="video" && up.duration && up.duration > 120){
        try{ await cloudinary.uploader.destroy(up.public_id, {resource_type:"video"} as any); }catch{}
        return res.status(400).json({success:false,msg:"Video must be max 2 minutes"});
      }
      mediaUrl=up.secure_url;
    }
    if(type==="text" && !textContent) return res.status(400).json({success:false,msg:"Text required"});
    const expiry=new Date(Date.now()+24*60*60*1000);
    const status=await StatusUpdateModel.create({
      userId, contentType:type, textContent, mediaUrl, backgroundColor, font,
      privacyMode: privacyMode||"all_friends",
      excludedFriends: excludedFriends? JSON.parse(typeof excludedFriends==="string"?excludedFriends:JSON.stringify(excludedFriends)) : [],
      includedFriends: includedFriends? JSON.parse(typeof includedFriends==="string"?includedFriends:JSON.stringify(includedFriends)) : [],
      viewers:[], expiryTime:expiry
    });
    try{ const io=getIO(); const user=await UserMOdel.findById(userId); const friends=user?.friends||[]; friends.forEach((f:any)=> io.to(f.toString()).emit("status-posted",{statusId:status._id, userId})); }catch{}
    return res.status(201).json({success:true, status});
  }catch(e){ console.error(e); return res.status(500).json({success:false,msg:"error"});}
};

export const getFriendsStatuses = async (req:Request,res:Response)=>{
  try{
    const userId=req.user?.userId;
    const user=await UserMOdel.findById(userId);
    const friends=user?.friends||[];
    const statuses=await StatusUpdateModel.find({ userId: { $in: friends }, expiryTime: { $gt: new Date() } }).sort({ createdAt:-1 }).populate("userId","username avatar firstName lastName").lean();
    // filter by privacy
    const filtered=statuses.filter((s:any)=>{
      const ownerId=s.userId?._id ? s.userId._id.toString() : s.userId.toString();
      // Need to check owner's privacy, but s currently contains privacyMode etc. Use s's own privacy fields
      if(s.privacyMode==="friends_except") return !s.excludedFriends.some((id:any)=> id.toString()===userId);
      if(s.privacyMode==="only_share_with") return s.includedFriends.some((id:any)=> id.toString()===userId);
      return true;
    });
    return res.json({success:true, statuses:filtered});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const getMyStatuses = async (req:Request,res:Response)=>{
  try{ const statuses=await StatusUpdateModel.find({ userId:req.user?.userId, expiryTime:{ $gt: new Date() } }).sort({createdAt:-1}); return res.json({success:true, statuses}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const getStatusById = async (req:Request,res:Response)=>{
  try{
    const s=await StatusUpdateModel.findById(req.params.statusId).populate("userId","username avatar firstName lastName");
    if(!s) return res.status(404).json({success:false,msg:"Not found"});
    if(s.expiryTime < new Date()) return res.status(410).json({success:false,msg:"Expired"});
    // Privacy check: if requester is not owner, verify visibility
    const requesterId=req.user?.userId;
    if(s.userId.toString()!==requesterId){
      const ownerId=(s.userId as any)._id ? (s.userId as any)._id.toString() : s.userId.toString();
      const user=await UserMOdel.findById(ownerId);
      const isFriend=user?.friends.some((f:any)=> f.toString()===requesterId);
      if(s.privacyMode==="friends_except" && s.excludedFriends.some((id:any)=> id.toString()===requesterId)){
        return res.status(403).json({success:false,msg:"Not authorized"});
      }
      if(s.privacyMode==="only_share_with" && !s.includedFriends.some((id:any)=> id.toString()===requesterId)){
        return res.status(403).json({success:false,msg:"Not authorized"});
      }
      // if not friend and privacy is friends only, block (all_friends requires friend)
      if(!isFriend){
        return res.status(403).json({success:false,msg:"Not authorized - not friends"});
      }
    }
    return res.json({success:true, status:s});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const markStatusViewed = async (req:Request,res:Response)=>{
  try{
    const s=await StatusUpdateModel.findById(req.params.statusId); if(!s) return res.status(404).json({success:false,msg:"Not found"});
    if(s.expiryTime < new Date()) return res.status(410).json({success:false,msg:"Expired"});
    const userId=req.user?.userId;
    // Privacy check before viewing
    if(s.userId.toString()!==userId){
      const owner=await UserMOdel.findById(s.userId);
      const isFriend=owner?.friends.some((f:any)=> f.toString()===userId);
      if(s.privacyMode==="friends_except" && s.excludedFriends.some((id:any)=> id.toString()===userId)){
        return res.status(403).json({success:false,msg:"Not authorized"});
      }
      if(s.privacyMode==="only_share_with" && !s.includedFriends.some((id:any)=> id.toString()===userId)){
        return res.status(403).json({success:false,msg:"Not authorized"});
      }
      if(!isFriend) return res.status(403).json({success:false,msg:"Not friends"});
    }
    if(s.viewers.some((v:any)=> v.userId.toString()===userId)) return res.json({success:true, status:s});
    s.viewers.push({userId, viewedAt:new Date()} as any); await s.save();
    try{ const io=getIO(); io.to(s.userId.toString()).emit("status-viewed",{statusId:s._id, viewerId:userId}); }catch{}
    return res.json({success:true, status:s});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const deleteStatus = async (req:Request,res:Response)=>{
  try{
    const s=await StatusUpdateModel.findById(req.params.statusId); if(!s) return res.status(404).json({success:false,msg:"Not found"});
    if(s.userId.toString()!==req.user?.userId) return res.status(403).json({success:false,msg:"Not owner"});
    const statusId=s._id;
    const userId=s.userId;
    await s.deleteOne();
    try{
      const io=getIO();
      const user=await UserMOdel.findById(userId);
      const friends=user?.friends||[];
      friends.forEach((f:any)=> io.to(f.toString()).emit("status-deleted",{statusId, userId}));
      io.to(userId.toString()).emit("status-deleted",{statusId, userId});
    }catch{}
    return res.json({success:true, msg:"Deleted"});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
