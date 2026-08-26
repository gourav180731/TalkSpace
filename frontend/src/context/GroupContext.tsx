import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../apis/socket";
import * as api from "../apis/group.api";

interface GroupCtx { groups:any[]; currentGroup:any|null; loading:boolean; fetchGroups:()=>Promise<void>; createGroup:(d:FormData)=>Promise<any>; selectGroup:(id:string)=>void; sendGroupMessage:(gid:string,d:FormData)=>Promise<void>; leaveGroup:(id:string)=>Promise<void>; }
const Ctx=createContext<GroupCtx|undefined>(undefined);
export const GroupProvider:React.FC<{children:React.ReactNode}> = ({children})=>{
  const [groups,setGroups]=useState<any[]>([]); const [currentGroup,setCurrentGroup]=useState<any|null>(null); const [loading,setLoading]=useState(false);
  const fetchGroups=async()=>{ setLoading(true); try{ const r=await api.getMyGroups(); setGroups(r.data.groups||[]);}catch{} finally{setLoading(false);} };
  useEffect(()=>{ fetchGroups(); },[]);
  useEffect(()=>{
    const onMsg=(d:any)=>{ setGroups(prev=> prev.map(g=> g._id===d.groupId? {...g, lastMessage:d.message}:g)); if(currentGroup?._id===d.groupId) setCurrentGroup((c:any)=> c? {...c}:c); };
    const onAdd=()=> fetchGroups(); const onRemove=(d:any)=>{ setGroups(prev=> prev.filter(g=> g._id!==d.groupId || d.memberId!=="self")); if(currentGroup?._id===d.groupId) fetchGroups(); };
    socket.on("group-message", onMsg); socket.on("group-member-added", onAdd); socket.on("group-member-removed", onRemove); socket.on("group-settings-updated", onAdd);
    return()=>{ socket.off("group-message", onMsg); socket.off("group-member-added", onAdd); socket.off("group-member-removed", onRemove); };
  },[currentGroup]);
  const createGroup=async(d:FormData)=>{ const r=await api.createGroup(d); setGroups(p=> [r.data.group, ...p]); return r.data.group; };
  const selectGroup=(id:string)=>{ const g=groups.find(x=> x._id===id); setCurrentGroup(g||null); };
  const sendGroupMessage=async(gid:string,d:FormData)=>{ await api.sendGroupMessage(gid,d); };
  const leaveGroup=async(id:string)=>{ await api.leaveGroup(id); setGroups(p=> p.filter(g=> g._id!==id)); if(currentGroup?._id===id) setCurrentGroup(null); };
  return <Ctx.Provider value={{groups,currentGroup,loading,fetchGroups,createGroup,selectGroup,sendGroupMessage,leaveGroup}}>{children}</Ctx.Provider>;
};
export const useGroup=()=>{ const c=useContext(Ctx); if(!c) throw new Error("useGroup"); return c; };
