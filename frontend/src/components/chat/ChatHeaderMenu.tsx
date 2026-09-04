import { useState, useEffect } from "react";
import { Info, Search, CheckSquare, BellOff, Clock, Lock, Heart, Download, X, Link2, Calendar, Users, Flag, Ban, Trash2, ChevronRight, Image as ImageIcon, Palette, Phone, Video } from "lucide-react";
import { muteChat, unmuteChat } from "../../apis/chatManagement.api";
import { axiosInstance } from "../../apis/axios";
import { setChatWallpaper } from "../../apis/settings.api";

export default function ChatHeaderMenu({ chat, onSearch, onSelectMode, onCloseChat, onContactInfo, onWallpaperChange, onCallVoice, onCallVideo, onShowCallHistory }: any) {
  const [open, setOpen] = useState(false);
  const [showMuteSub, setShowMuteSub] = useState(false);
  const [showWallpaperSub, setShowWallpaperSub] = useState(false);
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
  const handleLock = async()=>{
    let isCurrentlyLocked=false;
    try{ const r=await axiosInstance.get(`/chat-management/settings/${chatId}`); isCurrentlyLocked=!!r.data.isLocked; }catch{}
    const action = isCurrentlyLocked ? "unlock" : "lock";
    let pin = prompt(`Enter your Chat Lock PIN to ${action} this chat (min 4 chars):`);
    if(!pin) return;
    pin=pin.trim();
    if(pin.length<4){ alert("PIN must be at least 4 characters"); return; }
    try{
      const res=await axiosInstance.post("/chat-management/lock", { chatId, chatType: isGroup?"group":"direct", pin });
      alert(res.data.locked ? "Chat locked" : "Chat unlocked");
    }catch(e:any){
      const msg=e.response?.data?.msg||"";
      if(msg.includes("PIN required")){
        let pin2 = prompt("Create new Chat Lock PIN (min 4 chars):");
        if(!pin2) return; pin2=pin2.trim();
        if(pin2.length<4){ alert("PIN too short"); return; }
        const confirm=prompt("Confirm PIN:");
        if(confirm?.trim()!==pin2){ alert("PINs do not match"); return; }
        try{
          await axiosInstance.post("/chat-management/lock/setup", { pin: pin2 });
          const res2=await axiosInstance.post("/chat-management/lock", { chatId, chatType: isGroup?"group":"direct", pin: pin2 });
          alert(res2.data.locked ? "Chat locked with new PIN" : "Done");
        }catch(err:any){ alert(err.response?.data?.msg||"Failed to set PIN"); }
      } else {
        alert(msg||"Failed");
      }
    }
    setOpen(false);
  };
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
  const handleWallpaperPreset = async(value:string, label:string)=>{
    const fd=new FormData(); fd.append("wallpaper", JSON.stringify({type:"preset", value}));
    try{ await setChatWallpaper(chatId, fd); onWallpaperChange?.(value); alert(`Wallpaper: ${label}`); }catch(e:any){ alert(e.response?.data?.msg||"Failed"); }
    setOpen(false); setShowWallpaperSub(false);
  };
  const handleWallpaperGallery = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    const fd=new FormData(); fd.append("wallpaper", file);
    try{ const res=await setChatWallpaper(chatId, fd); const url=res.data.settings?.chatCustomizations?.find((c:any)=> c.chatId===chatId)?.wallpaper?.value || URL.createObjectURL(file); onWallpaperChange?.(url); alert("Wallpaper from gallery added"); }catch(err:any){ alert(err.response?.data?.msg||"Upload failed"); }
    setOpen(false); setShowWallpaperSub(false);
  };

  return (
    <div className="relative" onClick={e=>e.stopPropagation()}>
      <button onClick={(e)=>{ e.stopPropagation(); setOpen(!open); }} className="p-2 rounded-full hover:bg-white/10 text-white/80">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#111b21] border border-white/15 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] rounded-xl py-2 z-50 max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>{ onContactInfo?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Info size={18} className="opacity-70"/> Contact info</button>
          <button onClick={()=>{ onSearch?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Search size={18} className="opacity-70"/> Search</button>
          <button onClick={()=>{ onCallVoice?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Phone size={18} className="opacity-70"/> Voice call</button>
          <button onClick={()=>{ onCallVideo?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Video size={18} className="opacity-70"/> Video call</button>
          <button onClick={()=>{ onShowCallHistory?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Phone size={18} className="opacity-70"/> Call history</button>
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
          <div>
            <button onClick={()=> setShowWallpaperSub(!showWallpaperSub)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm justify-between">
              <span className="flex items-center gap-3"><ImageIcon size={18} className="opacity-70"/> Wallpaper</span><ChevronRight size={14} className={`opacity-40 transition ${showWallpaperSub? "rotate-90":""}`}/>
            </button>
            {showWallpaperSub && (
              <div className="mx-2 mb-2 p-2 bg-black/20 rounded-xl border border-white/10">
                <div className="text-[11px] text-white/50 px-2 py-1 flex items-center gap-1"><Palette size={12}/> Themes</div>
                <div className="grid grid-cols-3 gap-2 p-2">
                  <button onClick={()=> handleWallpaperPreset("","Default")} className="h-10 rounded-lg bg-[#0b0d12] border border-white/10 flex items-center justify-center text-[10px] text-white/60 hover:border-indigo-500/50">Default</button>
                  <button onClick={()=> handleWallpaperPreset("#121520","Dark")} className="h-10 rounded-lg bg-[#121520] border border-white/10 flex items-center justify-center text-[10px] text-white/60 hover:border-indigo-500/50">Dark</button>
                  <button onClick={()=> handleWallpaperPreset("#f8fafc","Light")} className="h-10 rounded-lg bg-[#f8fafc] border border-white/10 flex items-center justify-center text-[10px] text-slate-600 hover:border-indigo-500/50">Light</button>
                  <button onClick={()=> handleWallpaperPreset("linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)","Ocean")} className="h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 border border-white/10 hover:border-indigo-500/50" title="Ocean" />
                  <button onClick={()=> handleWallpaperPreset("linear-gradient(135deg, #0f172a 0%, #1e293b 100%)","Navy")} className="h-10 rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 border border-white/10 hover:border-indigo-500/50" title="Navy" />
                  <button onClick={()=> handleWallpaperPreset("linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)","Pastel")} className="h-10 rounded-lg bg-gradient-to-br from-purple-200 to-blue-200 border border-white/10 hover:border-indigo-500/50" title="Pastel" />
                </div>
                <label className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs cursor-pointer">
                  <ImageIcon size={14}/> Add image from gallery
                  <input type="file" accept="image/*" hidden onChange={handleWallpaperGallery} />
                </label>
                <button onClick={()=> handleWallpaperPreset("", "Clear")} className="w-full mt-1 px-3 py-1 text-xs text-white/50 hover:text-white text-center">Clear wallpaper</button>
              </div>
            )}
          </div>
          <button onClick={handleLock} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Lock size={18} className="opacity-70"/> Lock chat</button>
          <button onClick={handleFavourite} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Heart size={18} className="opacity-70"/> Add to favourites</button>

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
