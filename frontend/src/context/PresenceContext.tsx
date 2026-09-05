import { createContext, useContext, useEffect, useRef, useState } from "react";
import { socket } from "../apis/socket";
import { getPresence } from "../apis/presence.api";

type PresenceCtx = {
  onlineUsers: Set<string>;
  lastSeen: Record<string, string>;
  syncPresence: () => Promise<void>;
  isSyncing: boolean;
};

const PresenceContext = createContext<PresenceCtx>({
  onlineUsers: new Set(),
  lastSeen: {},
  syncPresence: async () => {},
  isSyncing: true,
});

export function PresenceProvider({ children }: any) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(true);
  const initialSyncedRef = useRef(false);

  const syncPresence = async () => {
    try {
      setIsSyncing(true);
      const r = await getPresence();
      if (r.data?.onlineUsers) setOnlineUsers(new Set(r.data.onlineUsers));
      if (r.data?.lastSeen) setLastSeen(r.data.lastSeen);
    } catch {} finally { setIsSyncing(false); initialSyncedRef.current = true; }
  };

  useEffect(() => {
    // initial fetch after mount (handles race where socket connected before listener)
    syncPresence();

    const onUserOnline = (userId: string) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
      // clear lastSeen when online again
      setLastSeen(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    };
    const onOnlineUsers = (users: string[]) => {
      setOnlineUsers(new Set(users));
      setIsSyncing(false);
      initialSyncedRef.current = true;
    };
    const onSyncResponse = (data: any) => {
      if (data?.onlineUsers) setOnlineUsers(new Set(data.onlineUsers));
      if (data?.lastSeen) setLastSeen(data.lastSeen);
      setIsSyncing(false);
      initialSyncedRef.current = true;
    };
    const onUserOffline = ({ userId, lastSeen: ls }: any) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      if (ls) setLastSeen(prev => ({ ...prev, [userId]: ls }));
    };

    socket.on("online-users", onOnlineUsers);
    socket.on("user-online", onUserOnline);
    socket.on("user-offline", onUserOffline);
    socket.on("presence:sync-response", onSyncResponse);

    const onConnect = () => {
      // after reconnect, re-sync presence and re-join groups (backend auto-joins, but also request sync)
      socket.emit("presence:sync");
      // small delay fetch as fallback
      setTimeout(() => syncPresence(), 400);
    };
    const onDisconnect = () => {
      // do NOT immediately mark all offline; keep state until explicit user-offline or sync
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect", onConnect as any);

    return () => {
      socket.off("user-online", onUserOnline);
      socket.off("user-offline", onUserOffline);
      socket.off("online-users", onOnlineUsers);
      socket.off("presence:sync-response", onSyncResponse);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect", onConnect as any);
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ onlineUsers, lastSeen, syncPresence, isSyncing }}>
      {children}
    </PresenceContext.Provider>
  );
}

export const usePresence = () => useContext(PresenceContext);
