import { useEffect, useState } from "react";
import ChatListItem from "./ChatListItem";

type Props = {
  friends: any[];
  onSelect: (user: any) => void;
  onClose: () => void;
};

export default function FriendsPickerSheet({
  friends,
  onSelect,
  onClose,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true));
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* SHEET */}
      <div
        className={`
          absolute bg-[#1f1f2e]
          overflow-y-auto
          transition-all duration-300 ease-out

          /* ---------- MOBILE (BOTTOM SHEET) ---------- */
          bottom-0 left-0 right-0
          max-h-[35vh]
          rounded-t-2xl
          border-t border-white/20

          /* ---------- DESKTOP (LEFT OF CHAT) ---------- */
          md:top-0 md:bottom-0
          md:left-[calc(50%-640px+320px)]
          md:w-[320px]
          md:max-h-full
          md:rounded-none
          md:border-t-0
          md:border-r md:border-white/20

          ${open
            ? "translate-y-0 translate-x-0 opacity-100"
            : "translate-y-6 md:-translate-x-6 opacity-0"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-medium">Your Friends</p>
            <button onClick={onClose} className="text-white/70">
              ✕
            </button>
          </div>

          {friends.length === 0 ? (
            <p className="text-white/60 text-sm text-center mt-6">
              No friends yet
            </p>
          ) : (
            friends.map((f) => (
              <ChatListItem
                key={f._id}
                user={f}
                onClick={() => {
                  onSelect(f);
                  onClose();
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
