import { ArrowLeft, Phone, Video, Search, Users } from "lucide-react";
import { usePresence } from "../../context/PresenceContext";
import { useGlobalCall } from "../../context/CallContext";
import ChatHeaderMenu from "./ChatHeaderMenu";
import { useState } from "react";

export default function ChatHeader({ user, onBack, onSearch, onSelectMode, onCloseChat, onContactInfo, onWallpaperChange }: any) {
  const [showGroupInfo,setShowGroupInfo]=useState(false);
  const { onlineUsers, lastSeen } = usePresence();
  const callSocket = useGlobalCall();
  const isOnline = onlineUsers.has(user._id);

  const isGroup = !!user.isGroup;
  const group = user.group || user;
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
          {isGroup ? `${group.members?.length||0} members${group.members?.filter((m:any)=> onlineUsers.has(m.toString()||m)).length ? ` · ${group.members?.filter((m:any)=> onlineUsers.has(m.toString()||m)).length} online` : ""}` :
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

      {/* ACTIONS spec screenshot: Video | Phone | Search | Three dots */}
      <div className="ml-auto flex items-center gap-1">
        {!user.isBot && (
          <>
            <button
              onClick={() => { if (callSocket.callStatus === "idle") user.onCall?.("video"); }}
              disabled={callSocket.callStatus !== "idle"}
              className={`p-2 rounded-full hover:bg-white/10 text-white transition ${
                callSocket.callStatus !== "idle"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              title="Video call"
            >
              <Video size={20} />
            </button>

            <button
              onClick={() => { if (callSocket.callStatus === "idle") user.onCall?.("audio"); }}
              disabled={callSocket.callStatus !== "idle"}
              className={`p-2 rounded-full hover:bg-white/10 text-white transition ${
                callSocket.callStatus !== "idle"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              title="Voice call"
            >
              <Phone size={20} />
            </button>
          </>
        )}
        <button onClick={()=> onSearch?.()} className="p-2 rounded-full hover:bg-white/10 text-white" title="Search">
          <Search size={20} />
        </button>
        <ChatHeaderMenu chat={user} onSearch={onSearch} onSelectMode={onSelectMode} onCloseChat={onCloseChat} onContactInfo={onContactInfo} onWallpaperChange={onWallpaperChange} />
      </div>
    </div>
      {isGroup && showGroupInfo && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=> setShowGroupInfo(false)}>
          <div onClick={e=> e.stopPropagation()} className="w-full max-w-sm bg-[#121520] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex flex-col items-center gap-3 mb-4">
              <img src={group.avatar||"/avatar-placeholder.png"} className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/30" alt="group"/>
              <h3 className="text-white font-semibold text-lg">{group.name}</h3>
              <p className="text-white/60 text-xs">{group.members?.length||0} members · {group.members?.filter((m:any)=> onlineUsers.has(m.toString()||m)).length||0} online</p>
              {group.description && <p className="text-white/70 text-sm text-center mt-1">{group.description}</p>}
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              <h4 className="text-indigo-400 font-semibold text-sm flex items-center gap-2"><Users size={16}/> Members</h4>
              {(group.members||[]).map((m:any, i:number)=>{
                const mid=m.toString ? m.toString() : m._id ? m._id.toString() : String(m);
                const isAdmin=group.admins?.some((a:any)=> a.toString()===mid);
                const isOnline=onlineUsers.has(mid);
                return <div key={mid+i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                  <div className="relative"><div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white">{mid.slice(-2)}</div>{isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#121520] rounded-full"/>}</div>
                  <span className="text-white text-sm flex-1 truncate">{mid}</span>
                  {isAdmin && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600 text-white">Admin</span>}
                </div>
              })}
            </div>
            <button onClick={()=> setShowGroupInfo(false)} className="w-full mt-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm">Close</button>
          </div>
        </div>
      )}
    </>
  );
}