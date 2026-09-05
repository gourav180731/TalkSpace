import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../apis/socket";
import * as api from "../apis/group.api";

interface GroupCtx { groups:any[]; currentGroup:any|null; loading:boolean; fetchGroups:()=>Promise<void>; createGroup:(d:FormData)=>Promise<any>; selectGroup:(id:string)=>void; sendGroupMessage:(gid:string,d:FormData)=>Promise<void>; leaveGroup:(id:string)=>Promise<void>; }
const Ctx=createContext<GroupCtx|undefined>(undefined);
export const GroupProvider:React.FC<{children:React.ReactNode}> = ({children})=>{
  const [groups,setGroups]=useState<any[]>([]); const [currentGroup,setCurrentGroup]=useState<any|null>(null); const [loading,setLoading]=useState(false);
  const groupsRef=React.useRef(groups); const currentGroupRef=React.useRef(currentGroup);
  useEffect(()=>{ groupsRef.current=groups; },[groups]); useEffect(()=>{ currentGroupRef.current=currentGroup; },[currentGroup]);
  const fetchGroups=async()=>{ setLoading(true); try{ const r=await api.getMyGroups(); setGroups(r.data.groups||[]);}catch{} finally{setLoading(false);} };
  useEffect(()=>{ fetchGroups(); },[]);
  useEffect(()=>{
    const onMsg=(d:any)=>{
      const gid=String(d.groupId);
      setGroups(prev=>{
        let found=false;
        const next=prev.map(g=> {
          if(String(g._id)===gid){
            found=true;
            return {...g, lastMessage:d.message, updatedAt: d.message?.createdAt || new Date().toISOString()};
          }
          return g;
        });
        if(!found) { fetchGroups(); return prev; }
        // reorder by lastMessage time desc for list preview correctness
        return [...next].sort((a:any,b:any)=> new Date(b.updatedAt||b.lastMessage?.createdAt||0).getTime() - new Date(a.updatedAt||a.lastMessage?.createdAt||0).getTime());
      });
      if(currentGroupRef.current && String(currentGroupRef.current._id)===gid){
        // no refetch needed, ChatWindow handles message append
      }
    };
    const onAdd=()=> fetchGroups();
    const onSettingsUpdate=(d:any)=>{
      if(d?.settings){
        setGroups(prev=> prev.map(g=> String(g._id)===String(d.groupId) ? {...g, ...d.settings} : g));
        if(currentGroupRef.current && String(currentGroupRef.current._id)===String(d.groupId)) setCurrentGroup((c:any)=> c? {...c, ...d.settings}:c);
      }
      fetchGroups();
    };
    const onRemove=()=>{ fetchGroups(); };
    const onConnect=()=>{
      fetchGroups();
      // auto-join all groups is done by backend on connect, but also ensure frontend emits for legacy
      const cur=groupsRef.current;
      cur.forEach((g:any)=> socket.emit("join-group",{groupId:g._id}));
    };
    socket.on("group-message", onMsg); socket.on("group-member-added", onAdd); socket.on("group-member-removed", onRemove); socket.on("group-settings-updated", onSettingsUpdate);
    socket.on("group-admin-promoted", onAdd); socket.on("group-admin-demoted", onAdd);
    socket.on("connect", onConnect);
    // also handle reconnect
    socket.io.on("reconnect", onConnect as any);
    return()=>{ socket.off("group-message", onMsg); socket.off("group-member-added", onAdd); socket.off("group-member-removed", onRemove); socket.off("group-settings-updated", onSettingsUpdate); socket.off("group-admin-promoted", onAdd); socket.off("group-admin-demoted", onAdd); socket.off("connect", onConnect); socket.io.off("reconnect", onConnect as any); };
  },[]);
  const createGroup=async(d:FormData)=>{ const r=await api.createGroup(d); setGroups(p=> [r.data.group, ...p]); return r.data.group; };
  const selectGroup=(id:string)=>{ const g=groups.find(x=> x._id===id); setCurrentGroup(g||null); };
  const sendGroupMessage=async(gid:string,d:FormData)=>{ await api.sendGroupMessage(gid,d); };
  const leaveGroup=async(id:string)=>{ await api.leaveGroup(id); setGroups(p=> p.filter(g=> g._id!==id)); if(currentGroup?._id===id) setCurrentGroup(null); };
  return <Ctx.Provider value={{groups,currentGroup,loading,fetchGroups,createGroup,selectGroup,sendGroupMessage,leaveGroup}}>{children}</Ctx.Provider>;
};
export const useGroup=()=>{ const c=useContext(Ctx); if(!c) throw new Error("useGroup"); return c; };
