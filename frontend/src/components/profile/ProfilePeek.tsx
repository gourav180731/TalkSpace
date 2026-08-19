import { usePresence } from "../../context/PresenceContext";

export default function ProfilePeek({ user, pos, onClose }: any) {
  const { onlineUsers } = usePresence();
  const isOnline = onlineUsers.has(user._id);

  return (
    <>
      {/* Click outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        style={{ top: pos.y, left: pos.x }}
        className="
          fixed z-50
          w-[220px]
          rounded-2xl
          bg-white/20 backdrop-blur-2xl
          border border-white/30
          shadow-2xl
          text-white
          animate-scale-in
        "
      >
        <div className="flex flex-col items-center py-5">
          {/* Avatar */}
          <div className="relative">
            <img
              src={user.avatar}
              className="w-20 h-20 rounded-full object-cover"
            />

            {/* Online badge */}
            <span
              className={`
                absolute bottom-1 right-1
                w-3.5 h-3.5 rounded-full
                border-2 border-[#1f1f2e]
                ${isOnline ? "bg-green-500" : "bg-gray-400"}
              `}
            />
          </div>

          {/* Name */}
          <p className="mt-3 text-base font-semibold truncate">
            {user.fullName || user.username}
          </p>

          {/* Username */}
          <p className="text-sm text-white/60">
            @{user.username}
          </p>
        </div>
      </div>
    </>
    );
}
