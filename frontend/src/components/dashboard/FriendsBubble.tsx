type FriendsBubbleProps = {
  onOpen: () => void;
};

export default function FriendsBubble({ onOpen }: FriendsBubbleProps) {
  return (
    <button
      onClick={onOpen}
      className="
        fixed md:absolute
        bottom-6 right-6

        /* OVAL SHAPE */
        w-16 h-14
        rounded-full

        /* MORE OPAQUE GLASS */
        bg-white/2
        backdrop-blur-2xl
        border border-white/40

        /* ICON */
        text-white text-2xl

        /* INTERACTION */
        hover:bg-white/45
        hover:scale-105
        active:scale-95
        transition-all duration-200

        z-50
        flex items-center justify-center
      "
      title="New chat"
    >
      💬
    </button>
  );
}
