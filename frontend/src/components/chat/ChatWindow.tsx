import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState} from "react";

import { useChatMessages } from "./hooks/useChatMessages";
import { useChatSocket } from "./hooks/useChatSocket";
import SearchBar from "../search/SearchBar";
import CallHistoryList from "../call/CallHistoryList";
import { getGroupMessages, sendGroupMessage } from "../../apis/group.api";
import { getUserSettings } from "../../apis/settings.api";
import { socket } from "../../apis/socket";

import { useGlobalCall } from "../../context/CallContext";

const safeDate = (date?: string) => {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateLabel = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
};

export default function ChatWindow({ chat, onBack }: any) {
  const { user } = useAuth();
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showSearch,setShowSearch]=useState(false);
  const [wallpaper,setWallpaper]=useState<string>("");
  const isGroup=!!chat.isGroup;
  const [groupMessages,setGroupMessages]=useState<any[]>([]);
  const [selectMode,setSelectMode]=useState(false);
  const [selectedIds,setSelectedIds]=useState<Set<string>>(new Set());
  const [showContactInfo,setShowContactInfo]=useState(false);
  const [isLocked,setIsLocked]=useState(false);
  const [lockChecked,setLockChecked]=useState(false);
  const [showCallHistory,setShowCallHistory]=useState(false);

const callSocket = useGlobalCall();
  
  const {
    messages,
    setMessages,
    hasMore,
    loadingMore,
    loadMessages,
    containerRef,
    endRef,
    shouldAutoScrollRef,
  } = useChatMessages(isGroup? "": chat._id);

  const { showNewMsgBtn, setShowNewMsgBtn, isTyping, markRead } = useChatSocket(
    {
      chatId: chat._id,
      userId: user?._id,
      setMessages: isGroup? setGroupMessages : setMessages,
      shouldAutoScrollRef,
      endRef,
    }
  );

  useEffect(()=>{
    if(isGroup){
      getGroupMessages(chat._id).then(r=> setGroupMessages(r.data.messages||[])).catch(()=>{});
      socket.emit("join-group",{groupId:chat._id});
      return ()=>{ socket.emit("leave-group",{groupId:chat._id}); };
    }
  },[chat._id, isGroup]);

  useEffect(()=>{
    getUserSettings().then(r=>{
      const cust=r.data.settings?.chatCustomizations?.find((c:any)=> c.chatId===chat._id);
      if(cust?.wallpaper?.value) setWallpaper(cust.wallpaper.value);
    }).catch(()=>{});
    // check lock
    import("../../apis/axios").then(({axiosInstance})=>{
        axiosInstance.get(`/chat-management/settings/${chat._id}`).then(r=>{ setIsLocked(!!r.data.isLocked); setLockChecked(true); }).catch(()=> setLockChecked(true));
      });
  },[chat._id]);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      endRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  useEffect(() => {
    setReplyTo(null);
  }, [chat._id]);

  useEffect(() => {
    if (!messages.length) return;

    const lastMsg = messages[messages.length - 1];

    // if last message is from other user → mark as read
    if (lastMsg.senderId !== user?._id) {
      markRead();
    }
  }, [chat._id]);


const scrollToMessage = async (messageId: string) => {
  const id = String(messageId);

  let attempts = 0;

  const tryScroll = async () => {
    const el = document.querySelector(
      `[data-msg-id="${id}"]`
    ) as HTMLElement | null;

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("reply-highlight");

      setTimeout(() => {
        el.classList.remove("reply-highlight");
      }, 1200);

      return;
    }

    // Load more messages if not found
    if (hasMore && !loadingMore && attempts < 5) {
      attempts++;
      await loadMessages();
      setTimeout(tryScroll, 120);
    }
  };

  tryScroll();
};


  const handleScroll = async () => {
    const el = containerRef.current;
    if (!el) return;

    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 20;

    shouldAutoScrollRef.current = atBottom;

    const lastVisibleMsg = visibleMessages[visibleMessages.length - 1];

    const hasUnreadFromChatUser =
      lastVisibleMsg && lastVisibleMsg.senderId !== user?._id;

    if (atBottom) {
      setShowNewMsgBtn(false);

      if (hasUnreadFromChatUser) {
        await markRead();
      }
    }

    if (el.scrollTop < 50 && hasMore && !loadingMore) {
      await loadMessages();
    }
  };
  const activeRaw = isGroup ? groupMessages : messages;
  const normalizedMessages = activeRaw.map((m:any) => ({
    ...m,
    __key: m._id ? `server-${m._id}` : `client-${m.clientId}`,
  }));
  const visibleMessages = normalizedMessages.filter((m:any) => {
    if (!m._id) return true;
    if(m.deletedFor?.includes(user._id)) return false;
    if(m.expiresAt && new Date(m.expiresAt) < new Date()) return false;
    return true;
  });

  const handleGroupSend = async (form:FormData)=>{
    try{ const r=await sendGroupMessage(chat._id, form); setGroupMessages(prev=> [...prev, r.data.message]); }catch{}
  };

  return (
    <div className="flex w-full flex-col h-full min-h-0 relative">
    <ChatHeader
  user={{
    ...chat,
   onCall: (type:any) => {
  callSocket.setCallUser(chat);
  callSocket.setCallType(type);
  callSocket.setCallStatus("calling");
}
     
  }}
  onBack={onBack}
  onSearch={()=> setShowSearch(!showSearch)}
  onSelectMode={()=> setSelectMode(true)}
  onCloseChat={()=> onBack?.()}
  onContactInfo={()=> setShowContactInfo(true)}
  onWallpaperChange={setWallpaper}
  onShowCallHistory={()=> setShowCallHistory(true)}
/>
    {showContactInfo && (
      <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=> setShowContactInfo(false)}>
        <div onClick={e=>e.stopPropagation()} className="w-full max-w-sm bg-[#111b21] border border-white/15 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col items-center gap-3">
            <img src={chat.avatar||"/avatar-placeholder.png"} className="w-24 h-24 rounded-full object-cover" />
            <h3 className="text-white font-semibold text-lg">{chat.username}</h3>
            <p className="text-white/60 text-sm">{chat.email||"No email"}</p>
            <p className="text-white/50 text-xs">{chat.bio||"Contact info"}</p>
            <button onClick={()=> setShowContactInfo(false)} className="mt-3 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm">Close</button>
          </div>
        </div>
      </div>
    )}
    {selectMode && (
      <div className="flex items-center justify-between px-3 py-2 bg-indigo-600 text-white text-sm">
        <span>{selectedIds.size} selected</span>
        <div className="flex gap-2">
          <button onClick={async()=>{
            if(!confirm(`Delete ${selectedIds.size} messages?`)) return;
            for(const id of selectedIds){ try{ await (await import("../../apis/chat.api")).deleteMessageForEveryoneApi(id); }catch{} }
            setSelectedIds(new Set()); setSelectMode(false);
          }} className="px-3 py-1 rounded-full bg-white/20">Delete</button>
          <button onClick={()=>{ const ids=[...selectedIds].join(", "); navigator.clipboard.writeText(ids); alert("Copied"); }} className="px-3 py-1 rounded-full bg-white/20">Copy</button>
          <button onClick={()=>{ setSelectMode(false); setSelectedIds(new Set()); }} className="px-3 py-1 rounded-full bg-white/10">Cancel</button>
        </div>
      </div>
    )}
    {showCallHistory && !isGroup && (
      <div className="p-2 bg-[#0b0d12]/50 border-b border-white/10 max-h-64 overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-white/80 text-xs font-semibold">Call history with {chat.username}</h4>
          <button onClick={()=> setShowCallHistory(false)} className="text-white/40 hover:text-white text-xs">✕</button>
        </div>
        <CallHistoryList userId={chat._id} />
      </div>
    )}
    {showSearch && <SearchBar chatId={chat._id} isGroup={isGroup} onJump={scrollToMessage} />}
    {lockChecked && isLocked && (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0d12]/80 backdrop-blur p-6 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl">🔒</div>
        <p className="text-white font-medium">This chat is locked</p>
        <p className="text-white/60 text-xs">Enter your Chat Lock PIN to view</p>
        <button onClick={async()=>{
          let pin=prompt("Enter Chat Lock PIN:");
          if(!pin) return;
          pin=pin.trim();
          if(pin.length<4){ alert("PIN must be at least 4 characters"); return; }
          try{
            const { toggleLock } = await import("../../apis/chatManagement.api");
            const res=await toggleLock(chat._id, isGroup?"group":"direct", pin);
            if(res.data.locked===false || res.data.success){
              setIsLocked(false);
            } else {
              // Fallback verify
              const { verifyChatLock } = await import("../../apis/chatManagement.api");
              await verifyChatLock(pin);
              setIsLocked(false);
            }
          }catch(e:any){ alert(e.response?.data?.msg||"Invalid PIN"); }
        }} className="px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white">Unlock</button>
        <button onClick={async()=>{
          let pin=prompt("Enter PIN to permanently remove Chat Lock (this will unlock all chats):");
          if(!pin) return;
          pin=pin.trim();
          try{
            const { removeChatLock } = await import("../../apis/chatManagement.api");
            await removeChatLock(pin);
            setIsLocked(false);
            alert("Chat Lock removed");
          }catch(e:any){ alert(e.response?.data?.msg||"Failed"); }
        }} className="text-xs text-white/50 underline">Remove lock</button>
      </div>
    )}

      {!(lockChecked && isLocked) && (
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={wallpaper?.startsWith("http") ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" } : wallpaper && wallpaper.startsWith("#") ? { backgroundColor: wallpaper } : wallpaper ? { background: wallpaper } : {}}
        className="
  flex-1 overflow-y-auto px-2 pt-3
  bg-transparent backdrop-blur-xl
  dark:bg-transparent
"
      >
        {visibleMessages.map((m, i) => {
          const prev = visibleMessages[i - 1];
          const currDate = safeDate(m.createdAt);
          const prevDate = safeDate(prev?.createdAt);

          const showDate =
            currDate &&
            (!prevDate || currDate.toDateString() !== prevDate.toDateString());

          const showAvatar = !prev || prev.senderId !== m.senderId;

          return (
            <div key={m.__key} className="w-full flex items-center gap-2">
              {selectMode && (
                <input type="checkbox" checked={selectedIds.has(m._id)} onChange={e=>{
                  const ns=new Set(selectedIds);
                  if(e.target.checked) ns.add(m._id); else ns.delete(m._id);
                  setSelectedIds(ns);
                }} className="ml-2 accent-indigo-600" />
              )}
              <div className="flex-1">
              {showDate && currDate && (
                <div className="text-center my-3 text-xs text-white/60">
                  {formatDateLabel(currDate.toISOString())}
                </div>
              )}
              <MessageBubble
                msg={m}
                chatUser={chat}
                showAvatar={showAvatar}
                onReply={(msg: any) => setReplyTo(msg)}
                onJump={scrollToMessage}
                onDeleteForMe={(id: string) => {
                  if(isGroup){
                    setGroupMessages((prev: any[]) => prev.map((mm:any)=> mm._id===id ? {...mm, deletedFor:[...(mm.deletedFor||[]), user._id]} : mm));
                  } else {
                    setMessages((prev: any[]) =>
                      prev.map((msg) =>
                        msg._id === id
                          ? {
                              ...msg,
                              deletedFor: [...(msg.deletedFor || []), user._id],
                            }
                          : msg
                      )
                    );
                  }
                }}
                isGroup={isGroup}
                groupId={isGroup ? chat._id : undefined}
                isGroupAdmin={isGroup ? (chat.group?.admins?.some((id:any)=> id.toString()===user?._id) || chat.admins?.some((id:any)=> id.toString()===user?._id)) : false}
              />
              </div>
            </div>
          );
        })}

        <div ref={endRef} />
      </div>
      )}

      {!(lockChecked && isLocked) && showNewMsgBtn && (
        <button
          onClick={() => {
            endRef.current?.scrollIntoView({ behavior: "smooth" });
            setShowNewMsgBtn(false);
            shouldAutoScrollRef.current = true;
          }}
          className="
           absolute bottom-[96px] md:bottom-[88px]
            left-1/2 -translate-x-1/2
            px-4 py-2 rounded-full
            bg-indigo-600 text-white shadow-lg
          "
        >
          New messages ↓
        </button>
      )}
     {!(lockChecked && isLocked) && (
     <div className="
  sticky bottom-2
  px-3
  md:bottom-0 md:px-0
">
{isTyping && (
  <div
    className="
      absolute -top-4 left-3
      text-[11px] md:text-xs
      text-[#2b1f16] dark:text-white
      select-none
      animate-typing-text
    "
  >
    typing
    <span className="typing-dots ml-0.5">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  </div>
)}

        {isGroup ? (
          <MessageInput
            chatId={chat._id}
            receiverId={chat._id}
            onLocalSend={(updater:any)=>{
              // adapter for group: handle functional updater or array
              const val= typeof updater==="function"? updater(groupMessages) : updater;
              // if MessageInput creates temp message, push to groupMessages
              if(Array.isArray(val)) setGroupMessages(val);
              else if(val) setGroupMessages(prev=> [...prev, val]);
            }}
            replyTo={replyTo}
            clearReply={() => setReplyTo(null)}
            onGroupSend={handleGroupSend}
          />
        ) : (
          <MessageInput
            chatId={chat._id}
            receiverId={chat._id}
            onLocalSend={setMessages}
            replyTo={replyTo}
            clearReply={() => setReplyTo(null)}
          />
        )}
      </div>
      )}
    </div>
  );
}
