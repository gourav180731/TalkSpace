import { Request, Response } from "express";
import { hashContact, matchHashedContacts } from "../../utils/contactSync";

export const syncContacts = async (req:Request,res:Response)=>{
  try{
    const { contacts }=req.body; // array of {phone,email,name}
    if(!Array.isArray(contacts)) return res.status(400).json({success:false,msg:"contacts array required"});
    const hashes=new Set<string>();
    for(const c of contacts){
      if(c.phone) hashes.add(hashContact(c.phone));
      if(c.email) hashes.add(hashContact(c.email));
      if(c.name) hashes.add(hashContact(c.name));
      // also handle multiple phones
      if(Array.isArray(c.phones)) c.phones.forEach((p:string)=> hashes.add(hashContact(p)));
    }
    if(hashes.size===0) return res.json({success:true, matches:[]});
    const matches=await matchHashedContacts([...hashes]);
    return res.json({success:true, matches});
  }catch(e){ return res.status(500).json({success:false,msg:"error"});}
};
