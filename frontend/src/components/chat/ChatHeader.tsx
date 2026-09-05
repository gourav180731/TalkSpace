import { ArrowLeft, Phone, Video, Users, LogOut } from "lucide-react";
import { usePresence } from "../../context/PresenceContext";
import { useGlobalCall } from "../../context/CallContext";
import { useAuth } from "../../context/AuthContext";
import ChatHeaderMenu from "./ChatHeaderMenu";
import { useState } from "react";
import { leaveGroup } from "../../apis/group.api";
import { useCall } from "../call/hooks/useCall";

export default function ChatHeader({ user, onBack, onSearch, onSelectMode, onCloseChat, onContactInfo, onWallpaperChange }: any) {
  const [showGroupInfo,setShowGroupInfo]=useState(false);
  const { onlineUsers, lastSeen } = usePresence();
  const { user: currentUser } = useAuth();
  const callSocket = useGlobalCall();
  const { remoteVideoRef, localVideoRef, remoteAudioRef } = useGlobalCall();
  const call = useCall(remoteVideoRef, localVideoRef, remoteAudioRef);
  const isOnline = onlineUsers.has(user._id);

  const isGroup = !!user.isGroup;
  const group = user.group || user;

  const getMemberId = (m:any) => {
    if(!m) return "";
    if(typeof m === 'string') return m;
    if(m._id) return m._id.toString();
    return String(m);
  };
  const getMemberName = (m:any) => {
    if(!m) return "Unknown";
    if(typeof m === 'string') return m.slice(-6);
    return m.username || (m.firstName ? `${m.firstName} ${m.lastName||''}`.trim() : "") || getMemberId(m).slice(-6) || "User";
  };
  const getMemberAvatar = (m:any) => {
    if(!m || typeof m === 'string') return `https://ui-avatars.com/api/?name=${getMemberName(m)}`;
    return m.avatar || `https://ui-avatars.com/api/?name=${getMemberName(m)}`;
  };
  const isMemberOnline = (m:any) => onlineUsers.has(getMemberId(m));
  const onlineCount = isGroup ? group.members?.filter((m:any)=> isMemberOnline(m)).length || 0 : 0;
  return (
    <>
    <div className="z-20 flex items-center gap-3 px-4 py-3 bg-[#121520]/60 backdrop-blur-xl border-b border-white/10 dark:bg-[#121520]/60 dark:border-white/10">
      {/* BACK (mobile only) */}
      <button onClick={onBack} className="md:hidden text-[#2b1f16] dark:text-white">
        <ArrowLeft size={24} />
      </button>

      {/* AVATAR */}
      <div className="relative cursor-pointer" onClick={()=> isGroup && setShowGroupInfo(true)}>
        {isGroup ? (
          <img src={group.avatar || "/avatar-placeholder.png"} className="w-10 h-10 rounded-full object-cover border border-white/10" alt="group"/>
        ) : user.isBot ? (
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            E
          </div>
        ) : (
          <img
            src={user.avatar || "/avatar-placeholder.png"}
            className="w-10 h-10 rounded-full object-cover"
          />
        )}
        {!isGroup && !user.isBot && isOnline && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#121520] rounded-full animate-pulse" />
        )}
        {isGroup && <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[8px] px-1 rounded-full border border-white/20">{group.members?.length||""}</span>}
      </div>

      {/* NAME + STATUS */}
      <div className="flex flex-col min-w-0 cursor-pointer" onClick={()=> isGroup && setShowGroupInfo(true)}>
        <span className="text-white font-semibold truncate flex items-center gap-1">{isGroup ? group.name||user.username : user.username} {isGroup && <Users size={12} className="opacity-50"/>}</span>
        <span className="text-xs text-white/60 truncate">
          {isGroup ? `${group.members?.length||0} members${onlineCount ? ` · ${onlineCount} online` : ""}` :
          callSocket.callStatus === "calling"
            ? "📡 Calling..."
            : callSocket.callStatus === "connected"
            ? "🎤 In call"
            : user.isBot
            ? "Echo · always here"
            : isOnline
            ? "online"
            : lastSeen[user._id]
            ? `last seen ${new Date(lastSeen[user._id]).toLocaleTimeString()}`
            : "offline"}
        </span>
      </div>

      {/* ACTIONS - Voice/Video directly visible, rest in 3-dot */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <button
          onClick={async () => {
            if (callSocket.callStatus !== "idle") return;
            if (isGroup) {
              try{
                // Use group call with WebRTC mesh (up to 8)
                await (call as any).startGroupCall?.(group._id, group.members || [], "audio");
                callSocket.setCallUser({ _id: group._id, username: group.name, avatar: group.avatar, isGroup:true });
                callSocket.setCallType("audio");
                callSocket.setCallStatus("calling");
              }catch{
                const { socket } = await import("../../apis/socket");
                socket.emit("group-call-start", { groupId: group._id, type: "audio" });
                callSocket.setCallUser({ _id: group._id, username: group.name, avatar: group.avatar, isGroup:true });
                callSocket.setCallType("audio");
                callSocket.setCallStatus("calling");
              }
            } else {
              user.onCall?.("audio");
            }
          }}
          className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white transition shrink-0"
          title="Voice call"
          aria-label="Voice call"
        >
          <Phone size={16} className="md:w-[18px] md:h-[18px]" />
        </button>
        <button
          onClick={async () => {
            if (callSocket.callStatus !== "idle") return;
            if (isGroup) {
              try{
                await (call as any).startGroupCall?.(group._id, group.members || [], "video");
                callSocket.setCallUser({ _id: group._id, username: group.name, avatar: group.avatar, isGroup:true });
                callSocket.setCallType("video");
                callSocket.setCallStatus("calling");
              }catch{
                const { socket } = await import("../../apis/socket");
                socket.emit("group-call-start", { groupId: group._id, type: "video" });
                callSocket.setCallUser({ _id: group._id, username: group.name, avatar: group.avatar, isGroup:true });
                callSocket.setCallType("video");
                callSocket.setCallStatus("calling");
              }
            } else {
              user.onCall?.("video");
            }
          }}
          className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white transition shrink-0"
          title="Video call"
          aria-label="Video call"
        >
          <Video size={16} className="md:w-[18px] md:h-[18px]" />
        </button>
        <ChatHeaderMenu chat={user} onSearch={onSearch} onSelectMode={onSelectMode} onCloseChat={onCloseChat} onContactInfo={onContactInfo} onWallpaperChange={onWallpaperChange} onShowCallHistory={()=> (window as any).__setShowCallHistory?.(true)} />
      </div>
    </div>
      {isGroup && showGroupInfo && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=> setShowGroupInfo(false)}>
          <div onClick={e=> e.stopPropagation()} className="w-full max-w-sm bg-[#121520] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="relative">
                <img src={group.avatar||"/avatar-placeholder.png"} className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/30" alt="group"/>
                {(() => {
                  const isAdmin = group.admins?.some((a:any)=> getMemberId(a)===currentUser?._id?.toString());
                  if(!isAdmin) return null;
                  return <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 border-2 border-[#121520] flex items-center justify-center cursor-pointer hover:bg-indigo-500" title="Change group photo">
                    <span className="text-[11px]">📷</span>
                    <input type="file" accept="image/*" hidden onChange={async(e)=>{
                      const file=e.target.files?.[0]; if(!file) return;
                      if(!file.type.startsWith("image/")){ alert("Only image allowed"); return; }
                      if(file.size>5*1024*1024){ alert("Max 5MB"); return; }
                      const fd=new FormData(); fd.append("avatar", file);
                      try{ const { updateGroup } = await import("../../apis/group.api"); await updateGroup(group._id, fd); alert("Group photo updated"); }catch(err:any){ alert(err.response?.data?.msg||"Failed"); }
                    }} />
                  </label>;
                })()}
              </div>
              <h3 className="text-white font-semibold text-lg">{group.name}</h3>
              <p className="text-white/60 text-xs">{group.members?.length||0} members · {onlineCount} online</p>
              {group.description && <p className="text-white/70 text-sm text-center mt-1">{group.description}</p>}
              {(() => {
                const isAdmin = group.admins?.some((a:any)=> getMemberId(a)===currentUser?._id?.toString());
                if(!isAdmin || !group.avatar) return null;
                return <button onClick={async()=>{
                  if(!confirm("Remove group photo?")) return;
                  const fd=new FormData(); fd.append("removeAvatar","true");
                  try{ const { updateGroup } = await import("../../apis/group.api"); await updateGroup(group._id, fd); alert("Group photo removed"); }catch(err:any){ alert(err.response?.data?.msg||"Failed"); }
                }} className="text-xs text-white/50 hover:text-rose-300 underline">Remove photo</button>;
              })()}
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              <h4 className="text-indigo-400 font-semibold text-sm flex items-center gap-2"><Users size={16}/> Members</h4>
              {(group.members||[]).map((m:any, i:number)=>{
                const mid=getMemberId(m);
                const name=getMemberName(m);
                const avatar=getMemberAvatar(m);
                const isAdmin=group.admins?.some((a:any)=> getMemberId(a)===mid);
                const isOnline=isMemberOnline(m);
                const isMe = currentUser?._id && mid === currentUser._id.toString();
                return <div key={mid+i} onClick={()=>{
                  if(isMe) return;
                  // Open direct chat with member (WhatsApp-like)
                  window.dispatchEvent(new CustomEvent("open-direct-chat", {detail: { _id: mid, username: name, avatar }}));
                  setShowGroupInfo(false);
                }} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer">
                  <div className="relative"><img src={avatar} className="w-8 h-8 rounded-full object-cover border border-white/10" alt={name} onError={(e)=>{(e.target as HTMLImageElement).src=`https://ui-avatars.com/api/?name=${name}`}} />{isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#121520] rounded-full"/>}</div>
                  <span className="text-white text-sm flex-1 truncate">{name} {isMe && <span className="text-white/40 text-xs">(You)</span>}</span>
                  {isAdmin && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white">Admin</span>}
                </div>
              })}
            </div>
            <button onClick={async()=>{
              if(!confirm(`Leave group "${group.name}"? You will no longer receive messages.`)) return;
              try{
                await leaveGroup(group._id);
                window.dispatchEvent(new CustomEvent("group-left", {detail: group._id}));
                setShowGroupInfo(false);
                onBack?.();
              }catch(e:any){ alert(e.response?.data?.msg || "Failed to leave group"); }
            }} className="w-full mt-3 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-center gap-2"><LogOut size={16}/> Leave Group</button>
            <button onClick={()=> setShowGroupInfo(false)} className="w-full mt-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm">Close</button>
          </div>
        </div>
      )}
    </>
  );
}