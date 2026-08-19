import NotificationItem from "./NotificationItem";
import { useNotifications } from "../../context/NotificationContext";

export default function NotificationsPanel() {
  const {
    notifications,
    loading,
    markLocalRead,
     markAllRead,
  unreadCount,
  } = useNotifications();

  return (
    <div
      className="
        relative
        z-40
        pointer-events-auto
        max-h-[calc(100vh-8rem)]
        overflow-y-auto
        px-2
      "
    >
      {/* LOADING */}
      {loading && (
        <div className="text-white/70 text-sm text-center mt-10">
          Loading notifications…
        </div>
      )}

      {/* EMPTY */}
      {!loading && notifications.length === 0 && (
        <div className="text-white/60 text-sm text-center mt-10">
          No notifications yet
        </div>
      )}
    {unreadCount > 0 && (
  <div className="flex justify-end mb-3">
    <button
      onClick={markAllRead}
      className="
        text-xs px-3 py-1 rounded-full
        bg-white/20 text-white/80
        hover:bg-white/30 transition
      "
    >
      Mark all as read
    </button>
  </div>
)}

      {/* LIST */}
      {!loading && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationItem
              key={n._id}
              notification={n}
              onRead={() => markLocalRead(n._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
