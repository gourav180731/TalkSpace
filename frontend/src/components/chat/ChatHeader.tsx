import { ArrowLeft, Phone, Video } from "lucide-react";
import { usePresence } from "../../context/PresenceContext";
import { useGlobalCall } from "../../context/CallContext";

export default function ChatHeader({ user, onBack }: any) {
  const { onlineUsers, lastSeen } = usePresence();
  const callSocket = useGlobalCall();
  const isOnline = onlineUsers.has(user._id);

  return (
    <div className="z-20 flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-xl border-b border-white/20">
      {/* BACK (mobile only) */}
      <button onClick={onBack} className="md:hidden text-white">
        <ArrowLeft size={24} />
      </button>

      {/* AVATAR */}
      <div className="relative">
        <img
          src={user.avatar || "/avatar-placeholder.png"}
          className="w-10 h-10 rounded-full object-cover"
        />
        {!user.isBot && isOnline && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 animate-pulse rounded-full" />
        )}
      </div>

      {/* NAME + STATUS */}
      <div className="flex flex-col">
        <span className="text-white font-semibold">{user.username}</span>
        <span className="text-xs text-white/70">
          {callSocket.callStatus === "calling"
            ? "📡 Calling..."
            : callSocket.callStatus === "connected"
            ? "🎤 In call"
            : user.isBot
            ? "🤖 AI Assistant"
            : isOnline
            ? "online"
            : lastSeen[user._id]
            ? `last seen ${new Date(lastSeen[user._id]).toLocaleTimeString()}`
            : "offline"}
        </span>
      </div>

      {/* ACTIONS */}
      <div className="ml-auto flex items-center gap-3">
        {!user.isBot && (
          <>
            <button
              onClick={() => { if (callSocket.callStatus === "idle") user.onCall?.("audio"); }}
              disabled={callSocket.callStatus !== "idle"}
              className={`text-white transition ${
                callSocket.callStatus !== "idle"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-110"
              }`}
            >
              <Phone size={20} />
            </button>

            <button
              onClick={() => { if (callSocket.callStatus === "idle") user.onCall?.("video"); }}
              disabled={callSocket.callStatus !== "idle"}
              className={`text-white transition ${
                callSocket.callStatus !== "idle"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-110"
              }`}
            >
              <Video size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}