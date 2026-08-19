import { markNotificationReadApi } from "../../apis/notification.api";

export default function NotificationItem({
  notification,
  onRead,
}: {
  notification: any;
  onRead: () => void;
}) {
  const handleRead = async () => {
    if (notification.read) return;

    try {
      await markNotificationReadApi(notification._id);
      onRead();
    } catch (e) {
      console.error("MARK READ ERROR", e);
    }
  };

  const actor = notification.actor?.username || "Someone";

  const messageMap: Record<string, string> = {
    FRIEND_REQUEST_ACCEPTED: `${actor} accepted your friend request`,
    FRIEND_REQUEST_REJECTED: `${actor} rejected your friend request`,
    FRIEND_REQUEST_CANCELLED: `${actor} cancelled the friend request`,
    UNFRIENDED: `${actor} removed you from their friends`,
    FRIEND_REQUEST_INCOMING: `${actor} sent you a friend request`,
  };

  return (
    <div
      onClick={handleRead}
      className={`
        relative z-50 pointer-events-auto
        p-4 rounded-2xl cursor-pointer
        backdrop-blur-2xl
        border border-white/30
        transition-all duration-200

        ${
          notification.read
            ? "bg-white/15 text-white/70"
            : `
              bg-white/30 text-white
              shadow-[0_0_20px_rgba(99,102,241,0.45)]
              hover:bg-white/35
            `
        }
      `}
    >
      {/* UNREAD DOT */}
      {!notification.read && (
        <span
          className="
            absolute top-3 right-3
            w-2.5 h-2.5 rounded-full
            bg-indigo-400
            shadow-[0_0_10px_rgba(99,102,241,0.9)]
          "
        />
      )}

      <p className="text-sm leading-snug">
        {messageMap[notification.type] || "System notification"}
      </p>

      <p className="text-xs mt-1 text-white/50">
        {new Date(notification.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
