import { Request, Response } from "express";
import CallHistory from "../../models/callHistory.model";
import { Types } from "mongoose";

export const logCall = async (data: {
  caller: string;
  receiver: string;
  callType: "audio"|"video";
  status: "missed"|"rejected"|"completed"|"cancelled"|"incoming"|"outgoing";
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}) => {
  try{
    const { caller, receiver, callType, status, startTime, endTime, duration } = data;
    // Avoid duplicate for same call within 2 seconds
    const recent = await CallHistory.findOne({
      caller, receiver, callType,
      createdAt: { $gt: new Date(Date.now()-2000) }
    });
    if(recent && recent.status===status) return recent;
    const record = await CallHistory.create({
      caller, receiver, callType, status,
      startTime: startTime || new Date(),
      endTime: endTime || (status==="missed"||status==="rejected" ? new Date() : undefined),
      duration: duration || 0,
    });
    return record;
  }catch(e){ console.error("logCall error", e); }
};

export const getGlobalHistory = async (req:Request,res:Response)=>{
  try{
    const userId=req.user?.userId;
    const page=parseInt(req.query.page as string)||1;
    const limit=20;
    const skip=(page-1)*limit;
    const histories=await CallHistory.find({
      $or: [{ caller: userId }, { receiver: userId }]
    }).populate("caller","username avatar").populate("receiver","username avatar").sort({createdAt:-1}).skip(skip).limit(limit).lean();
    const mapped=histories.map((h:any)=>{
      const isOutgoing=h.caller.toString()===userId;
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
    const histories=await CallHistory.find({
      $or: [
        { caller: userId, receiver: otherId },
        { caller: otherId, receiver: userId }
      ]
    }).sort({createdAt:-1}).skip(skip).limit(limit).lean();
    const mapped=histories.map((h:any)=>{
      const isOutgoing=h.caller.toString()===userId;
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
