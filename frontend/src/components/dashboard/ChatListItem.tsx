import { usePresence } from "../../context/PresenceContext";
import { useProfilePeek } from "../profile/useProfilePeek";
import ProfilePeek from "../profile/ProfilePeek";

type Props = {
  user: any;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  onClick: () => void;
};

export default function ChatListItem({
  user,
  lastMessage,
  lastMessageAt,
  unreadCount = 0,
  onClick,
}: Props) {

   if (!user || !user._id) return null;
  const { onlineUsers } = usePresence();
  const isOnline = onlineUsers.has(user._id);

  const peek = useProfilePeek();

  return (
    <>
      <div
        onClick={onClick}
        className="
          flex items-center gap-3 p-3 rounded-xl
          hover:bg-white/10 active:bg-white/20
          transition cursor-pointer
        "
      >
        {/* Avatar (CLICKABLE) */}
        <div
          className="
            relative shrink-0
            cursor-pointer
            hover:ring-2 hover:ring-indigo-400/60
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
            className="w-11 h-11 rounded-full object-cover"
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

        {/* Unread badge */}
        {unreadCount > 0 && !user.isBot && (
          <div
            className="
              min-w-[22px] h-[22px]
              px-2 text-xs font-semibold
              flex items-center justify-center
              rounded-full
              bg-indigo-500 text-white
              shadow-[0_0_10px_rgba(99,102,241,0.9)]
            "
          >
            {unreadCount}
          </div>
        )}
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
