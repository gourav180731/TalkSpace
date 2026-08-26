import { Request, Response } from "express";
import MessageModal from "../../models/message.model";
import GroupChatModel from "../../models/groupChat.model";

export const searchMessages = async (req:Request,res:Response)=>{
  try{
    const chatId=req.params.chatId; const q=req.query.q as string; const page=parseInt(req.query.page as string)||1; const limit=50;
    if(!q) return res.status(400).json({success:false,msg:"q required"});
    const userId=req.user?.userId;
    // verify membership via chatId is other user id type: we just search by chatId string (hashed)
    const results=await MessageModal.find({ chatId: chatId, text: { $regex: q, $options:"i" }, isDeleted:false, deletedFor: { $ne: userId } }).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean();
    return res.json({success:true, results, hasMore: results.length===limit});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
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
