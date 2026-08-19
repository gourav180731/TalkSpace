import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState} from "react";

import { useChatMessages } from "./hooks/useChatMessages";
import { useChatSocket } from "./hooks/useChatSocket";

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
  } = useChatMessages(chat._id);

  const { showNewMsgBtn, setShowNewMsgBtn, isTyping, markRead } = useChatSocket(
    {
      chatId: chat._id,
      userId: user?._id,
      setMessages,
      shouldAutoScrollRef,
      endRef,
    }
  );

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
  const normalizedMessages = messages.map((m) => ({
    ...m,
    __key: m._id ? `server-${m._id}` : `client-${m.clientId}`, //  prefix matters
  }));

  const visibleMessages = normalizedMessages.filter((m) => {
    if (!m._id) return true;

    return !m.deletedFor?.includes(user._id);
  });

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
/>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="
  flex-1 overflow-y-auto px-2 pt-3
  bg-white/10 backdrop-blur-xl
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
            <div key={m.__key} className="w-full">
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
                }}
              />
            </div>
          );
        })}

        <div ref={endRef} />
      </div>

      {showNewMsgBtn && (
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
      text-white
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

        <MessageInput
          chatId={chat._id}
          receiverId={chat._id}
          onLocalSend={setMessages}
          replyTo={replyTo}
          clearReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
}
