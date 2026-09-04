import { useState, useEffect } from "react";
import { UserPlus, Star, CheckSquare, MailCheck, Lock, LogOut, Phone, User, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SidebarHeaderMenu({ onNewGroup, onStarred, onSelectChats, onMarkAllRead }: any) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [appLocked, setAppLocked] = useState(()=> localStorage.getItem("appLocked")==="true");

  useEffect(()=>{
    const close=()=> setOpen(false);
    if(open) document.addEventListener("click", close);
    return ()=> document.removeEventListener("click", close);
  },[open]);

  const handleAppLock = ()=>{
    const next = !appLocked;
    if(next){
      const pin = prompt("Set app lock PIN (min 4 chars):");
      if(pin===null) return;
      if(!pin || pin.length<4){ alert("PIN must be at least 4 characters"); return; }
      const confirm=prompt("Confirm PIN:");
      if(confirm!==pin){ alert("PINs do not match"); return; }
      localStorage.setItem("appLockPin", pin);
    }
    localStorage.setItem("appLocked", String(next));
    setAppLocked(next);
    alert(next ? "App locked — reload will require PIN" : "App unlocked");
    setOpen(false);
  };

  const handleLogout = async()=>{
    try{ await logout(); }catch{}
    navigate("/login");
    setOpen(false);
  };

  return (
    <div className="relative" onClick={e=>e.stopPropagation()}>
      <button onClick={(e)=>{ e.stopPropagation(); setOpen(!open); }} className="p-2 rounded-full hover:bg-white/10 text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#111b21] border border-white/15 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] rounded-xl py-2 z-50" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>{ navigate("/profile"); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><User size={18} className="opacity-70"/> Profile</button>
          <button onClick={()=>{ onNewGroup?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><UserPlus size={18} className="opacity-70"/> New group</button>
          <button onClick={()=>{ onStarred?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Star size={18} className="opacity-70"/> Starred messages</button>
          <button onClick={()=>{ onSelectChats?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><CheckSquare size={18} className="opacity-70"/> Select chats</button>
          <button onClick={()=>{ onMarkAllRead?.(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><MailCheck size={18} className="opacity-70"/> Mark all as read</button>
          <button onClick={()=>{ navigate("/call-history"); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Phone size={18} className="opacity-70"/> Call history</button>
          <button onClick={()=>{ navigate("/notifications"); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Bell size={18} className="opacity-70"/> Notifications</button>
          <div className="h-px bg-white/10 my-1"/>
          <button onClick={handleAppLock} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><Lock size={18} className="opacity-70"/> {appLocked ? "Unlock app" : "App lock"}</button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-white text-sm"><LogOut size={18} className="opacity-70"/> Log out</button>
        </div>
      )}
    </div>
  );
}
