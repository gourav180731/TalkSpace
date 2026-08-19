import { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../apis/socket";

type PresenceCtx = {
  onlineUsers: Set<string>;
  lastSeen: Record<string, string>;
};

const PresenceContext = createContext<PresenceCtx>({
  onlineUsers: new Set(),
  lastSeen: {},
});

export function PresenceProvider({ children }: any) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});

  useEffect(() => {
    const onUserOnline = (userId: string) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    };
const onOnlineUsers = (users: string[]) => {
  setOnlineUsers(new Set(users));
};

    const onUserOffline = ({ userId, lastSeen }: any) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });

      setLastSeen(prev => ({
        ...prev,
        [userId]: lastSeen,
      }));
    };

socket.on("online-users", onOnlineUsers);
    socket.on("user-online", onUserOnline);
      socket.on("user-offline", onUserOffline);
    


    return () => {
      socket.off("user-online", onUserOnline);
        socket.off("user-offline", onUserOffline);
          socket.off("online-users", onOnlineUsers);
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ onlineUsers, lastSeen }}>
      {children}
    </PresenceContext.Provider>
  );
}

export const usePresence = () => useContext(PresenceContext);
