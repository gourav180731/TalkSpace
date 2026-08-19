import ChatListItem from "./ChatListItem";
import { useEffect, useState } from "react";

type Props = {
  friends: any[];
  onSelect: (user: any) => void;
  onClose: () => void;
};

export default function FriendsPickerPanel({
  friends,
  onSelect,
  onClose,
}: Props) {

const [open, setOpen] = useState(false);

useEffect(() => {
  requestAnimationFrame(() => setOpen(true));
}, []);



  return (
    <>
      {/* Click outside to close (NO scroll lock) */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Floating panel */}
     <div
  className={`
    fixed bottom-24 right-6 z-50
    w-80 max-h-[420px]
    rounded-2xl
    bg-white/20 backdrop-blur-2xl
    border border-white/30
    shadow-2xl
    flex flex-col
    pointer-events-auto

    transform transition-all duration-200 ease-out
    ${open
      ? "opacity-100 scale-100 translate-y-0"
      : "opacity-0 scale-95 translate-y-2"}
  `}
  onClick={(e) => e.stopPropagation()}
>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <p className="text-white font-semibold">Your Friends</p>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
    </>
  );
}
