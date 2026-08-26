import { useEffect, useState, useRef } from "react";
import { getAllUsersApi } from "../../apis/friend.api";
import { getChatListApi } from "../../apis/chat.api";
import { socket } from "../../apis/socket";
import { getMyFriendsApi } from "../../apis/friend.api";

export function useSidebar() {
  const [chats, setChats] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"chats" | "requests" | "starred" | "archived">("chats");
  const [friends, setFriends] = useState<any[]>([]);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const loadAllUsers = async (search: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await getAllUsersApi(search || undefined, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setAllUsers(Array.isArray(res.data?.users) ? res.data.users : []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      console.error("loadAllUsers error", err);
      setAllUsers([]);
    }
  };

  const loadChats = async () => {
    try {
      const res = await getChatListApi();
      setChats(Array.isArray(res.data?.chats) ? res.data.chats : []);
      // also load archived ids
      try{
        const { getArchivedChats } = await import("../../apis/chatManagement.api");
        const ar = await getArchivedChats();
        setArchivedIds(new Set((ar.data.archived||[]).map((a:any)=> a.chatId)));
      }catch{}
    } catch {
      setChats([]);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await getMyFriendsApi();
      setFriends(res.data.users || []);
    } catch {
      setFriends([]);
    }
  };

  /* -------- INITIAL LOAD + SEARCH (debounced) -------- */
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      loadAllUsers(query);
    }, query ? 300 : 0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  /* -------- INITIAL LOAD for chats & friends -------- */
  useEffect(() => {
    loadChats();
    loadFriends();
  }, []);

  /* -------- SOCKET: UNREAD -------- */
  useEffect(() => {
    const onUnreadUpdate = ({ from }: any) => {
      setChats((prev) => {
        let updated = false;
        const next = prev.map((chat) => {
          if (
            chat.user?._id?.toString() === from.toString() &&
            !updated
          ) {
            updated = true;
            return {
              ...chat,
              unreadCount: (chat.unreadCount || 0) + 1,
              lastMessageAt: new Date().toISOString(),
            };
          }
          return chat;
        });
        return updated
          ? [
              next.find((c) => c.user?._id?.toString() === from.toString()),
              ...next.filter(
                (c) => c.user?._id?.toString() !== from.toString()
              ),
            ].filter(Boolean)
          : prev;
      });
    };

    socket.on("unread-update", onUnreadUpdate);
    return () => {
      socket.off("unread-update", onUnreadUpdate);
    };
  }, []);

  /* -------- SOCKET: RESET UNREAD -------- */
  useEffect(() => {
    const onMessagesRead = ({ by }: any) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat.user?._id?.toString() === by.toString()
            ? { ...chat, unreadCount: 0 }
            : chat
        )
      );
    };

    socket.on("messages-read", onMessagesRead);
    return () => {
      socket.off("messages-read", onMessagesRead);
    };
  }, []);

  return {
    chats,
    setChats,
    allUsers,
    friends,
    query,
    setQuery,
    mode,
    setMode,
    loadChats,
    archivedIds,
    setArchivedIds,
    selectMode,
    setSelectMode,
  };
}
