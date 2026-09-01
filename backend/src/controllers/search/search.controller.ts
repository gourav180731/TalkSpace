import { Request, Response } from "express";
import MessageModal from "../../models/message.model";
import GroupChatModel from "../../models/groupChat.model";
import { getChatId } from "../../utils/constants";
import UserMOdel from "../../models/user.model";
import mongoose from "mongoose";

export const searchMessages = async (req:Request,res:Response)=>{
  try{
    const otherUserId=req.params.chatId; const rawQ=req.query.q as string; const page=parseInt(req.query.page as string)||1; const limit=50;
    if(!rawQ || !rawQ.trim()) return res.status(400).json({success:false,msg:"q required"});
    const q=rawQ.trim();
    const userId=req.user?.userId;
    if(!mongoose.Types.ObjectId.isValid(otherUserId)) return res.status(400).json({success:false,msg:"Invalid chatId"});
    // verify friendship / block via chatPermission logic
    const me=await UserMOdel.findById(userId);
    const other=await UserMOdel.findById(otherUserId);
    if(!me||!other) return res.status(404).json({success:false,msg:"User not found"});
    if(me.blockedUsers.some((id:any)=> id.toString()===otherUserId) || other.blockedUsers.some((id:any)=> id.toString()===userId)){
      return res.status(403).json({success:false,msg:"Blocked"});
    }
    if(!other.isBot && !me.friends.some((id:any)=> id.toString()===otherUserId)){
      return res.status(403).json({success:false,msg:"Not friends"});
    }
    const chatId=getChatId(userId!, otherUserId);
    // Escape regex special chars for partial match
    const escaped=q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const results=await MessageModal.find({ chatId: chatId, text: { $regex: escaped, $options:"i" }, isDeleted:false, deletedFor: { $ne: userId } }).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean();
    // return shaped data per issue
    const shaped=results.map((m:any)=> ({ _id:m._id, senderId:m.senderId, receiverId:m.receiverId, chatId:m.chatId, text:m.text, mimeType:m.mimeType, createdAt:m.createdAt, updatedAt:m.updatedAt, isEdited:m.isEdited, status:m.status, isDeleted:m.isDeleted }));
    return res.json({success:true, results: shaped, hasMore: results.length===limit});
  }catch(e){ console.error(e); return res.status(500).json({success:false,msg:"error"});}
};

export const searchGroupMessages = async (req:Request,res:Response)=>{
  try{
    const groupId=req.params.groupId; const q=req.query.q as string; const page=parseInt(req.query.page as string)||1; const limit=50;
    if(!q) return res.status(400).json({success:false,msg:"q required"});
    const group=await GroupChatModel.findById(groupId); if(!group) return res.status(404).json({success:false,msg:"Group not found"});
    if(!group.members.some((m:any)=> m.toString()===req.user?.userId)) return res.status(403).json({success:false,msg:"Not member"});
    const regex=new RegExp(q,"i");
    const matched=group.messages.filter((m:any)=> !m.isDeleted && m.text && regex.test(m.text)).sort((a:any,b:any)=> b.createdAt.getTime()-a.createdAt.getTime()).slice((page-1)*limit, page*limit);
    return res.json({success:true, results:matched});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
