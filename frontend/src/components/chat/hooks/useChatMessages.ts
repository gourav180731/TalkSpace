import { useEffect, useRef, useState } from "react";
import { getMessagesApi } from "../../../apis/chat.api";

const PAGE_SIZE = 20;

const mergeUniqueMessages = (oldMsgs: any[], newMsgs: any[]) => {
  const map = new Map<string, any>();

  [...oldMsgs, ...newMsgs].forEach((msg) => {
  const key = msg._id || msg.clientId;
if (key) {
  map.set(key.toString(), msg);
}

  });

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
  );
};

export function useChatMessages(chatId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const loadMessages = async (reset = false) => {
    if (loadingMore) return;
    setLoadingMore(true);

    const res = await getMessagesApi(chatId, {
      skip: reset ? 0 : skip,
      limit: PAGE_SIZE,
    });

    const newMessages = res.data.messages || [];

    if (reset) {
      setMessages(newMessages);
      setSkip(PAGE_SIZE);
      setHasMore(true);

      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: "auto" })
      );

      setLoadingMore(false);
      return;
    }

    if (newMessages.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    const el = containerRef.current;
    const prevHeight = el?.scrollHeight || 0;

    setMessages((prev) =>
      mergeUniqueMessages(prev, newMessages)
    );
    setSkip((prev) => prev + PAGE_SIZE);

    requestAnimationFrame(() => {
      if (!el) return;
      el.scrollTop = el.scrollHeight - prevHeight;
    });

    setLoadingMore(false);
  };

  useEffect(() => {
    setMessages([]);
    setSkip(0);
    setHasMore(true);
    shouldAutoScrollRef.current = true;
    loadMessages(true);
  }, [chatId]);

  return {
    messages,
    setMessages,
    hasMore,
    loadingMore,
    loadMessages,
    containerRef,
    endRef,
    shouldAutoScrollRef,
  };
}
