import { ArrowLeft, Phone, Video, Search } from "lucide-react";
import { usePresence } from "../../context/PresenceContext";
import { useGlobalCall } from "../../context/CallContext";
import ChatHeaderMenu from "./ChatHeaderMenu";

export default function ChatHeader({ user, onBack, onSearch, onSelectMode, onCloseChat, onContactInfo }: any) {
  const { onlineUsers, lastSeen } = usePresence();
  const callSocket = useGlobalCall();
  const isOnline = onlineUsers.has(user._id);

  return (
    <div className="z-20 flex items-center gap-3 px-4 py-3 bg-[#121520]/60 backdrop-blur-xl border-b border-white/10 dark:bg-[#121520]/60 dark:border-white/10">
      {/* BACK (mobile only) */}
      <button onClick={onBack} className="md:hidden text-[#2b1f16] dark:text-white">
        <ArrowLeft size={24} />
      </button>

      {/* AVATAR */}
      <div className="relative">
        {user.isBot ? (
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] flex items-center justify-center text-white font-bold text-lg shadow-md"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            E
          </div>
        ) : (
          <img
            src={user.avatar || "/avatar-placeholder.png"}
            className="w-10 h-10 rounded-full object-cover"
          />
        )}
        {!user.isBot && isOnline && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 animate-pulse rounded-full" />
        )}
      </div>

      {/* NAME + STATUS */}
      <div className="flex flex-col">
        <span className="text-[#2b1f16] font-semibold dark:text-white">{user.username}</span>
        <span className="text-xs text-[#2b1f16]/60 dark:text-white/70">
          {callSocket.callStatus === "calling"
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
        <ChatHeaderMenu chat={user} onSearch={onSearch} onSelectMode={onSelectMode} onCloseChat={onCloseChat} onContactInfo={onContactInfo} />
      </div>
    </div>
  );
}