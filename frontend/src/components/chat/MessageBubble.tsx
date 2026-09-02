import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useState, useRef } from "react";
import {
  deleteMessageForEveryoneApi,
  deleteMessageForMeApi,
  messageReactionApi,
  editMessageApi,
} from "../../apis/chat.api";
import { deleteGroupMessage, deleteGroupMessageForMe, editGroupMessage } from "../../apis/group.api";
import { Paperclip, Check, CheckCheck, Clock } from "lucide-react";
import FilePreview from "./FilePreview";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function MessageBubble({ msg, onReply, onJump, onDeleteForMe, isGroup, groupId, isGroupAdmin }: any) {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const startX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    if (e.changedTouches[0].clientX - startX.current > 60) onReply?.(msg);
    startX.current = null;
  };

  const myId    = user?._id?.toString();
  const senderId = typeof msg.senderId === "object"
    ? msg.senderId._id?.toString()
    : msg.senderId?.toString();
  const isMe = senderId === myId;

  const react = async (messageId: string, emoji: string) => {
    try { await messageReactionApi(messageId, emoji); setShowActions(false); }
    catch (err) { console.error("Reaction failed", err); }
  };

  return (
    <div
      data-msg-id={msg._id ?? msg.clientId}
      className={`flex w-full min-w-0 ${isMe ? "justify-end" : "justify-start"} mb-1`}
      onClick={() => setShowActions(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        onContextMenu={e => { e.preventDefault(); setShowActions(true); }}
        className={`
          relative w-fit min-w-0 max-w-[80%] px-4 py-2 rounded-[22px] text-sm
          leading-relaxed whitespace-pre-wrap break-words backdrop-blur-md animate-msg
          ${isMe ? "bubble-me rounded-br-[8px]" : "bubble-them text-[#2b1f16] rounded-bl-[8px] dark:text-white"}
        `}
      >
        {/* ACTIONS spec 18 - dark popup #111b21 border white/15 blur-xl */}
        {showActions && (
          <div className="absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-[#111b21] border border-white/15 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] rounded-2xl p-3 animate-scale-in">
            <div className="flex flex-wrap gap-2 mb-2 text-xs">
              <button onClick={e => { e.stopPropagation(); onReply?.(msg); setShowActions(false); }} className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/90">Reply</button>
              {isMe && !msg.isDeleted && msg._id && (()=>{ const age=Date.now()-new Date(msg.createdAt).getTime(); return age<15*60*1000; })() && (
                <button onClick={async(e)=>{ e.stopPropagation(); const nv=prompt("Edit message:", msg.text); if(nv && nv!==msg.text){ try{
                  if(isGroup && groupId){ await editGroupMessage(groupId, msg._id, nv); }
                  else { await editMessageApi(msg._id, nv); }
                }catch{} } setShowActions(false); }} className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/90">Edit</button>
              )}
              <button disabled={!msg._id} onClick={async () => {
                if (!msg._id) return;
                try {
                  if(isGroup && groupId){
                    try { await deleteGroupMessageForMe(groupId, msg._id); } catch {}
                    onDeleteForMe?.(msg._id);
                  } else {
                    await deleteMessageForMeApi(msg._id);
                    onDeleteForMe?.(msg._id);
                  }
                } catch {}
                setShowActions(false);
              }} className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70">Delete for me</button>
              {(isMe || (isGroup && isGroupAdmin)) && !msg.isDeleted && (
                <button disabled={!msg._id} onClick={async () => {
                  if (!msg._id) return;
                  try{
                    if(isGroup && groupId){
                      await deleteGroupMessage(groupId, msg._id);
                    } else {
                      await deleteMessageForEveryoneApi(msg._id);
                    }
                  }catch{}
                  setShowActions(false);
                }} className="px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300">Delete for everyone</button>
              )}
            </div>
            <div className="flex gap-1">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => msg._id && react(msg._id, e)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-lg hover:scale-110 transition">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MESSAGE CONTENT */}
        {msg.isDeleted ? (
          <span className="italic opacity-60">This message was deleted</span>
        ) : (
          <>
            {/* REPLY PREVIEW */}
            {msg.replyTo && (
              <div
                className="relative z-10 mb-2 px-3 py-2 rounded-lg bg-black/25 border-l-4 border-[#ffc545] text-xs cursor-pointer hover:bg-black/30"
                onClick={e => { e.stopPropagation(); const id = msg.replyTo._id ?? msg.replyTo.clientId; if (id) onJump?.(id.toString()); }}
              >
                <div className="opacity-70 mb-1">
                  {msg.replyTo.senderId?.toString() === myId ? "You" : msg.replyTo.senderName || "user"}
                </div>
                <div className="truncate">{msg.replyTo.text || "Attachment"}</div>
              </div>
            )}

            {/* TEXT */}
            {msg.text?.trim() && (
              <div className="whitespace-pre-wrap break-words">
                {msg.text}
                {msg.isEdited && <span className="ml-1 text-[10px] opacity-50 italic">edited</span>}
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] opacity-60 align-bottom">
                  {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {isMe && (
                    <>
                      {msg.status === "sending"   && <Clock size={12} />}
                      {msg.status === "sent"       && !msg.isRead && msg.status !== "read" && <Check size={14} className="sent-pulse text-gray-500" />}
                      {msg.status === "delivered"  && !msg.isRead && <CheckCheck size={14} className="sent-pulse text-gray-500" />}
                      {(msg.isRead || msg.status === "read") && <CheckCheck size={14} className="text-blue-500 sent-pulse" />}
                    </>
                  )}
                </span>
              </div>
            )}

            {/* FILE PREVIEW — handles image / video / audio / docs */}
            {(msg.file || msg.attachment) && (
              <FilePreview
                file={typeof msg.file === "string" ? msg.file : undefined}
                attachment={msg.attachment && typeof msg.attachment === "object" && "size" in msg.attachment ? msg.attachment : undefined}
                mimeType={msg.mimeType ?? msg.fileType ?? undefined}
                isMe={isMe}
              />
            )}

            {/* TEMP ATTACHMENT (no URL yet) */}
            {msg.attachment && !msg.file && !(msg.attachment && typeof msg.attachment === "object" && "size" in msg.attachment) && (
              <div className="mt-2 flex items-center gap-2 text-sm opacity-80">
                <Paperclip size={16} /> {msg.attachment.name}
              </div>
            )}
          </>
        )}

        {msg.status === "failed" && (
          <button onClick={msg.onRetry} className="text-red-400 text-xs mt-1">Retry</button>
        )}

        {/* REACTIONS */}
        {msg.reactions?.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {(Object.entries(
              msg.reactions.reduce((acc: Record<string, number>, r: any) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc;
              }, {} as Record<string, number>)
            ) as [string, number][]).map(([emoji, count]) => (
              <span key={emoji} className="px-2 py-0.5 text-xs bg-[#2b1f16]/10 rounded-full reaction-pop dark:bg-white/20">
                {emoji} {count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(MessageBubble);