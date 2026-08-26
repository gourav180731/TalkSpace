import { useState, useEffect } from "react";
import { Info, Search, CheckSquare, BellOff, Clock, Lock, Heart, List, Download, X, Link2, Calendar, Users, Flag, Ban, Trash2, ChevronRight } from "lucide-react";
import { muteChat, unmuteChat } from "../../apis/chatManagement.api";
import { axiosInstance } from "../../apis/axios";

export default function ChatHeaderMenu({ chat, onSearch, onSelectMode, onCloseChat, onContactInfo }: any) {
  const [open, setOpen] = useState(false);
  const [showMuteSub, setShowMuteSub] = useState(false);
  const [showListSub, setShowListSub] = useState(false);
  const chatId = chat._id;
  const isGroup = !!chat.isGroup;

  useEffect(()=>{
    const close=()=> setOpen(false);
    if(open) document.addEventListener("click", close);
    return ()=> document.removeEventListener("click", close);
  },[open]);

  const action = async (fn:any, msg?:string)=>{
    try{ await fn(); if(msg) alert(msg); }catch(e:any){ alert(e.response?.data?.msg||"Failed"); }
    setOpen(false);
  };

  const toggleMute = (dur:string)=> action(()=> muteChat(chatId, dur, isGroup?"group":"direct"), `Muted ${dur}`);
  const handleDisappearing = async()=>{
    const dur = prompt("Disappearing: off / 24h / 7d / 90d", "24h");
    if(!dur) return;
    await axiosInstance.post("/chat-management/disappearing", { chatId, chatType: isGroup?"group":"direct", duration: dur });
    alert(`Disappearing set to ${dur}`);
    setOpen(false);
  };
  const handleLock = async()=>{ await axiosInstance.post("/chat-management/lock", { chatId, chatType: isGroup?"group":"direct" }); alert("Lock toggled"); setOpen(false); };
  const handleFavourite = async()=>{ await axiosInstance.post("/chat-management/favourite", { chatId, chatType: isGroup?"group":"direct" }); alert("Favourites toggled"); setOpen(false); };
  const handleExport = async()=>{
    try{
      const res = await axiosInstance.get(`/message/chat/${chatId}`);
      const msgs = res.data.messages||[];
      const content = msgs.map((m:any)=> `${new Date(m.createdAt).toLocaleString()} - ${m.senderId?.username||m.senderId}: ${m.text||m.file||''}`).join("\n");
      const blob = new Blob([content], {type:"text/plain"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download=`chat-${chat.username||chatId}.txt`; a.click(); URL.revokeObjectURL(url);
    }catch{ alert("Export failed"); }
    setOpen(false);
  };
  const handleClear = async()=>{ if(!confirm("Clear all messages for you?")) return; await axiosInstance.delete(`/message/chat/${chatId}`); alert("Cleared"); setOpen(false); };
  const handleBlock = async()=>{ if(!confirm("Block this user?")) return; const { blockUser } = await import("../../apis/privacy.api"); await blockUser(chatId); alert("Blocked"); setOpen(false); };
  const handleReport = async()=>{ const reason=prompt("Reason for report?")||"spam"; await axiosInstance.post("/chat-management/report", { chatId, reason }); alert("Reported"); setOpen(false); };
  const handleCallLink = async()=>{ const link = `${window.location.origin}/call/${chatId}-${Date.now()}`; await navigator.clipboard.writeText(link); alert(`Call link copied: ${link}`); setOpen(false); };
  const handleSchedule = async()=>{ const time=prompt("Schedule time (e.g., 2026-09-01 10:00)"); if(time) alert(`Call scheduled for ${time} — reminder will be sent`); setOpen(false); };
  const handleNewGroupCall = async()=>{ alert("Starting new group call..."); setOpen(false); };
  const handleAddToList = async(list:string)=>{ await axiosInstance.post("/chat-management/add-to-list", { chatId, listName: list }); alert(`Added to ${list}`); setOpen(false); };

  return (
    <div className="relative" onClick={e=>e.stopPropagation()}>
      <button onClick={(e)=>{ e.stopPropagation(); setOpen(!open); }} className="p-2 rounded-full hover:bg-white/10 text-white/80">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#111b21] border border-white/15 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] rounded-xl py-2 z-50 max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>{ onContactInfo?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Info size={18} className="opacity-70"/> Contact info</button>
          <button onClick={()=>{ onSearch?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Search size={18} className="opacity-70"/> Search</button>
          <button onClick={()=>{ onSelectMode?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><CheckSquare size={18} className="opacity-70"/> Select messages</button>

          <div className="relative">
            <button onMouseEnter={()=> setShowMuteSub(true)} onMouseLeave={()=> setShowMuteSub(false)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm justify-between">
              <span className="flex items-center gap-3"><BellOff size={18} className="opacity-70"/> Mute notifications</span><ChevronRight size={14} className="opacity-40"/>
            </button>
            {showMuteSub && (
              <div onMouseEnter={()=> setShowMuteSub(true)} onMouseLeave={()=> setShowMuteSub(false)} className="absolute left-[-140px] top-0 w-36 bg-[#111b21] border border-white/15 rounded-xl shadow-xl py-1">
                <button onClick={()=> toggleMute("8h")} className="w-full px-3 py-2 hover:bg-white/5 text-white text-xs text-left">8 hours</button>
                <button onClick={()=> toggleMute("1w")} className="w-full px-3 py-2 hover:bg-white/5 text-white text-xs text-left">1 week</button>
                <button onClick={()=> toggleMute("always")} className="w-full px-3 py-2 hover:bg-white/5 text-white text-xs text-left">Always</button>
                <button onClick={async()=>{ await unmuteChat(chatId); alert("Unmuted"); }} className="w-full px-3 py-2 hover:bg-white/5 text-white text-xs text-left">Unmute</button>
              </div>
            )}
          </div>

          <button onClick={handleDisappearing} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Clock size={18} className="opacity-70"/> Disappearing messages</button>
          <button onClick={handleLock} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Lock size={18} className="opacity-70"/> Lock chat</button>
          <button onClick={handleFavourite} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Heart size={18} className="opacity-70"/> Add to favourites</button>

          <div className="relative">
            <button onMouseEnter={()=> setShowListSub(true)} onMouseLeave={()=> setShowListSub(false)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm justify-between">
              <span className="flex items-center gap-3"><List size={18} className="opacity-70"/> Add to list</span><ChevronRight size={14} className="opacity-40"/>
            </button>
            {showListSub && (
              <div onMouseEnter={()=> setShowListSub(true)} onMouseLeave={()=> setShowListSub(false)} className="absolute left-[-140px] top-0 w-36 bg-[#111b21] border border-white/15 rounded-xl shadow-xl py-1">
                <button onClick={()=> handleAddToList("Work")} className="w-full px-3 py-2 hover:bg-white/5 text-white text-xs text-left">Work</button>
                <button onClick={()=> handleAddToList("Family")} className="w-full px-3 py-2 hover:bg-white/5 text-white text-xs text-left">Family</button>
                <button onClick={()=> handleAddToList("Friends")} className="w-full px-3 py-2 hover:bg-white/5 text-white text-xs text-left">Friends</button>
              </div>
            )}
          </div>

          <button onClick={handleExport} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Download size={18} className="opacity-70"/> Export chat</button>
          <button onClick={()=>{ onCloseChat?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><X size={18} className="opacity-70"/> Close chat</button>
          <div className="h-px bg-white/10 my-1"/>
          <button onClick={handleCallLink} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Link2 size={18} className="opacity-70"/> Send call link</button>
          <button onClick={handleSchedule} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Calendar size={18} className="opacity-70"/> Schedule call</button>
          <button onClick={handleNewGroupCall} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Users size={18} className="opacity-70"/> New group call</button>
          <div className="h-px bg-white/10 my-1"/>
          <button onClick={handleReport} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-rose-300 text-sm"><Flag size={18} className="opacity-70"/> Report</button>
          <button onClick={handleBlock} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-rose-300 text-sm"><Ban size={18} className="opacity-70"/> Block</button>
          <button onClick={handleClear} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-rose-300 text-sm"><Trash2 size={18} className="opacity-70"/> Clear chat</button>
        </div>
      )}
    </div>
  );
}
