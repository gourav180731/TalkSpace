import { Request, Response } from "express";
import StickerPackModel from "../../models/stickerPack.model";

export const getStickerPacks = async (req:Request,res:Response)=>{
  try{ const packs=await StickerPackModel.find().lean(); return res.json({success:true, packs}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const getStickerPackById = async (req:Request,res:Response)=>{
  try{ const p=await StickerPackModel.findById(req.params.packId); if(!p) return res.status(404).json({success:false,msg:"Not found"}); return res.json({success:true, pack:p}); }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};

export const seedStickers = async ()=>{
  const count=await StickerPackModel.countDocuments(); if(count>0) return;
  await StickerPackModel.create([
    { name:"Smileys", description:"Classic smiley stickers", thumbnail:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f600.png", stickers:[
      {id:"s1", name:"grin", url:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f600.png", thumbnail:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f600.png"},
      {id:"s2", name:"joy", url:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f602.png", thumbnail:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f602.png"},
      {id:"s3", name:"heart", url:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png", thumbnail:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png"},
    ]},
    { name:"Animals", description:"Cute animals", thumbnail:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f431.png", stickers:[
      {id:"a1", name:"cat", url:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f431.png", thumbnail:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f431.png"},
      {id:"a2", name:"dog", url:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f436.png", thumbnail:"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f436.png"},
    ]},
  ]);
};
