import { TextInput } from "@mantine/core";

import ChatListItem from "./ChatListItem";
import SearchResults from "./SearchResults";
import FriendRequests from "./FriendRequests";
import FriendsBubble from "./FriendsBubble";
import FriendsPicker from "./FriendsPicker";

import { useSidebar } from "./useSidebar";

type SidebarProps = {
  onSelectChat: (user: any) => void;
  showFriendsPicker: boolean;
  setShowFriendsPicker: React.Dispatch<React.SetStateAction<boolean>>;
};
export default function Sidebar({
  onSelectChat,
  showFriendsPicker,
  setShowFriendsPicker,
}: SidebarProps) {
  const {
    chats,
    setChats,
    friends,
    allUsers,
    query,
    setQuery,
    mode,
    setMode,
    loadChats,
  } = useSidebar();

  return (
    <div
      className="
    relative h-full flex flex-col text-white

    md:bg-white/5
    md:border-r md:border-white/10
    md:shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)]

    
  "
    >
      {/*  SEARCH */}
      <div
        className="
    sticky top-0 z-20 p-3 space-y-2

    bg-white/20 backdrop-blur-xl
    border-b border-white/20

    md:bg-transparent md:backdrop-blur-0 md:border-0
  "
      >
        {/* BRANDING (MOBILE ONLY) */}
        <h1 className="md:hidden text-2xl font-bold text-white tracking-wide">
          ChitChat
        </h1>
        <TextInput
          placeholder="Search users"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          radius="xl"
          classNames={{
            input:
              "bg-white/90 text-black rounded-full px-4 py-3 focus:ring-2 focus:ring-indigo-400",
          }}
        />

        <div className="flex gap-3 mt-5">
          <button
            onClick={() => {
              setMode("chats");
              setQuery("");
            }}
            className={`text-xs px-3 py-1 rounded-lg ${
              mode === "chats"
                ? "bg-indigo-500"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            Chats
          </button>

          <button
            onClick={() => {
              setMode("requests");
              setQuery("");
            }}
            className={`text-xs px-3 py-1 rounded-lg ${
              mode === "requests"
                ? "bg-indigo-500"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            Requests
          </button>
        </div>
      </div>

      {/*  LIST */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2 pb-28">
        {mode === "requests" && <FriendRequests onAccepted={loadChats} />}

        {mode === "chats" && query && <SearchResults users={allUsers} />}

        {mode === "chats" &&
          !query &&
          chats
            .filter((chat) => chat?.user)
            .map((chat) => {
              const key = chat._id || chat.user._id;

              return (
                <ChatListItem
                  key={key}
                  user={chat.user}
                  unreadCount={chat.unreadCount || 0}
                  lastMessage={chat.lastMessage?.text}
                  lastMessageAt={chat.lastMessageAt}
                  onClick={() => {
                    setChats((prev) =>
                      prev.map((c) =>
                        (c._id || c.user?._id) === key
                          ? { ...c, unreadCount: 0 }
                          : c
                      )
                    );
                    onSelectChat(chat.user);
                  }}
                />
              );
            })}
      </div>

      {/*  NEW CHAT */}
      <div className="hidden md:block absolute bottom-4 right-4">
        <FriendsBubble onOpen={() => setShowFriendsPicker(true)} />
      </div>

      {showFriendsPicker && (
        <FriendsPicker
          friends={friends}
          onSelect={(f: any) => {
            onSelectChat(f);
            setShowFriendsPicker(false);
          }}
          onClose={() => setShowFriendsPicker(false)}
        />
      )}
    </div>
  );
}
