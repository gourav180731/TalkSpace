import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../apis/socket";
import * as api from "../apis/status.api";
const Ctx=createContext<any>(undefined);
export const StatusProvider:React.FC<{children:React.ReactNode}> = ({children})=>{
  const [friendsStatuses,setFriendsStatuses]=useState<any[]>([]); const [myStatuses,setMyStatuses]=useState<any[]>([]); const [loading,setLoading]=useState(false);
  const fetchFriends=async()=>{ setLoading(true); try{ const r=await api.getFriendsStatuses(); setFriendsStatuses(r.data.statuses||[]);}catch{} finally{setLoading(false);} };
  const fetchMine=async()=>{ try{ const r=await api.getMyStatuses(); setMyStatuses(r.data.statuses||[]);}catch{} };
  useEffect(()=>{ fetchFriends(); fetchMine(); const onPosted=()=> fetchFriends(); const onViewed=(d:any)=> setMyStatuses(prev=> prev.map(s=> s._id===d.statusId? {...s, viewers:[...s.viewers,{userId:d.viewerId, viewedAt:new Date()}]}:s)); socket.on("status-posted",onPosted); socket.on("status-viewed",onViewed); return()=>{ socket.off("status-posted",onPosted); socket.off("status-viewed",onViewed); }; },[]);
  const createStatus=async(d:FormData)=>{ const r=await api.createStatus(d); setMyStatuses(p=> [r.data.status,...p]); };
  const viewStatus=async(id:string)=>{ await api.viewStatus(id); };
  const deleteStatus=async(id:string)=>{ await api.deleteStatus(id); setMyStatuses(p=> p.filter(s=> s._id!==id)); };
  return <Ctx.Provider value={{friendsStatuses, myStatuses, loading, fetchFriends, fetchMine, createStatus, viewStatus, deleteStatus}}>{children}</Ctx.Provider>;
};
export const useStatus=()=> useContext(Ctx);
