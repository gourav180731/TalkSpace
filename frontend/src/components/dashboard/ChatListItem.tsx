import { usePresence } from "../../context/PresenceContext";
import { useProfilePeek } from "../profile/useProfilePeek";
import ProfilePeek from "../profile/ProfilePeek";

import { useState } from "react";
import { pinChat, unpinChat, archiveChat, muteChat, unmuteChat } from "../../apis/chatManagement.api";

type Props = {
  user: any;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  onClick: () => void;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  onArchived?: (chatId:string)=>void;
};

export default function ChatListItem({
  user,
  lastMessage,
  lastMessageAt,
  unreadCount = 0,
  onClick,
  isPinned,
  isMuted,
  onArchived,
}: Props) {
  const [menu,setMenu]=useState(false);
  const chatId=user._id;

   if (!user || !user._id) return null;
  const { onlineUsers } = usePresence();
  const isOnline = onlineUsers.has(user._id);

  const peek = useProfilePeek();

  return (
    <>
      <div
        onClick={onClick}
        onContextMenu={e=>{e.preventDefault(); setMenu(!menu);}}
        className={`
          flex items-center gap-3 p-3 rounded-xl
          hover:bg-white/5 active:bg-white/10
          transition cursor-pointer relative border border-transparent
          ${isPinned ? "bg-white/5 border-white/10":""}
        `}
      >
        {isPinned && <span className="absolute -top-1 -left-1 text-[10px]">📌</span>}
        {isMuted && <span className="absolute -top-1 right-6 text-[10px]">🔇</span>}
        {/* Avatar (CLICKABLE) */}
        <div
          className="
            relative shrink-0
            cursor-pointer
            hover:ring-2 hover:ring-orange-400/60
            rounded-full transition
            hover:scale-105 active:scale-95

          "
          onClick={(e) => {
            e.stopPropagation(); // prevent chat open
            peek.open(e, user);
          }}
        >
          <img
            src={user.avatar}
            className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm"
          />

          {/* Online dot */}
          {!user.isBot && (
          <span
            className={`
              absolute bottom-0 right-0
              w-3 h-3 rounded-full
           
              ${isOnline ? "bg-green-500" : "bg-gray-400"}
            `}
            />
            )}
        </div>
        

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <p className="text-white font-medium truncate">
              {user.username}
            </p>

            {lastMessageAt && (
              <span className="text-[10px] text-white/50">
                {new Date(lastMessageAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          <p className="text-sm text-white/60 truncate mt-0.5">
            {typeof lastMessage === "string"
              ? lastMessage
              : "Say hi 👋"}
          </p>
        </div>

        {/* Unread badge spec 32 indigo */}
        {unreadCount > 0 && !user.isBot && (
          <div
            className="
              min-w-[22px] h-[22px]
              px-2 text-xs font-semibold
              flex items-center justify-center
              rounded-full
              bg-indigo-600 text-white
              shadow-[0_0_12px_rgba(99,102,241,0.6)]
            "
          >
            {unreadCount}
          </div>
        )}
        <button onClick={e=>{e.stopPropagation(); setMenu(!menu);}} className="opacity-40 hover:opacity-100 px-1">⋮</button>
        {menu && <div className="absolute right-2 top-12 z-10 bg-[#111b21] border border-white/15 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] p-2 text-xs space-y-1 min-w-[140px]" onClick={e=>e.stopPropagation()}>
          <button onClick={async()=>{ try{ isPinned? await unpinChat(chatId): await pinChat(chatId); }catch(e:any){alert(e.response?.data?.msg||"Pin failed")} setMenu(false); }} className="w-full text-left px-2 py-1 hover:bg-white/5 text-white rounded">{isPinned?"Unpin":"Pin"} Chat</button>
          <button onClick={async()=>{ await archiveChat(chatId); onArchived?.(chatId); setMenu(false); }} className="w-full text-left px-2 py-1 hover:bg-white/5 text-white rounded">Archive</button>
          <button onClick={async()=>{ const dur=prompt("Mute duration: 8h, 1w, always"); if(dur) await muteChat(chatId, dur); setMenu(false); }} className="w-full text-left px-2 py-1 hover:bg-black/5 rounded">{isMuted?"Mute again":"Mute"}</button>
          {isMuted && <button onClick={async()=>{ await unmuteChat(chatId); setMenu(false);}} className="w-full text-left px-2 py-1 hover:bg-black/5 rounded">Unmute</button>}
        </div>}
      </div>

      {/* Profile Peek */}
      {peek.user && (
        <ProfilePeek
          user={peek.user}
          pos={peek.pos}
          onClose={peek.close}
        />
      )}
    </>
  );
}
