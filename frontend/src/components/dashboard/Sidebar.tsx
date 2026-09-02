import { TextInput } from "@mantine/core";

import ChatListItem from "./ChatListItem";
import SearchResults from "./SearchResults";
import FriendRequests from "./FriendRequests";
import FriendsBubble from "./FriendsBubble";
import FriendsPicker from "./FriendsPicker";
import CreateGroupModal from "../groups/CreateGroupModal";
import GroupList from "../groups/GroupList";
import StatusList from "../status/StatusList";
import SidebarHeaderMenu from "./SidebarHeaderMenu";
import { useState } from "react";
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
    archivedIds,
    setArchivedIds,
    deletedIds,
    setDeletedIds,
    mutedIds,
    selectMode,
    setSelectMode,
  } = useSidebar() as any;
  const [showGroupModal,setShowGroupModal]=useState(false);
  const [showGroups,setShowGroups]=useState(false);
  const [selectedChatIds,setSelectedChatIds]=useState<Set<string>>(new Set());
  // expose for header menu
  (window as any).__setChatSelectMode = setSelectMode;

  return (
    <div
      className="
    relative h-full flex flex-col text-white

    md:bg-transparent
    md:border-r md:border-white/10
    md:shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)]

    dark:md:bg-transparent
    dark:md:border-white/10
  "
    >
      {/*  HEADER - WhatsApp style Chats + ⋮ + + */}
      <div
        className="
    sticky top-0 z-20 p-3 space-y-3

    bg-[#121520]/50 backdrop-blur-xl
    border-b border-white/10

    md:bg-transparent md:backdrop-blur-0 md:border-0

    dark:bg-[#121520]/20 dark:border-white/10
  "
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Chats</h2>
          <div className="flex items-center gap-1">
            <button onClick={()=> setShowGroupModal(true)} className="p-2 rounded-full hover:bg-white/10 text-white" title="New chat"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg></button>
            <SidebarHeaderMenu onNewGroup={()=> setShowGroupModal(true)} onStarred={()=> setMode("starred" as any)} onSelectChats={()=> (window as any).__setChatSelectMode?.(true)} onMarkAllRead={async()=>{
              for(const c of chats){
                if(c.unreadCount>0 && c.user?._id){
                  try{ await (await import("../../apis/chat.api")).markReadApi(c.user._id); }catch{}
                }
              }
              setChats((prev:any)=> prev.map((c:any)=> ({...c, unreadCount:0})));
            }} />
          </div>
        </div>
        {/* BRANDING (MOBILE ONLY) - kept hidden on desktop but show Chats already */}
        <div className="md:hidden flex items-center gap-2 text-sm text-white/60">
          <span>WhatsApp-style header — New group etc. in ⋮</span>
        </div>
        <TextInput
          placeholder="Search colorful friends ✨"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          radius="xl"
          classNames={{
            input:
              "bg-white text-black rounded-full px-4 py-3 focus:ring-2 focus:ring-[#FF6B6B] border border-black/5 shadow-sm",
          }}
        />

        <div className="flex gap-3 mt-5 flex-wrap">
          <button
            onClick={() => {
              setMode("chats");
              setQuery("");
            }}
 className={`text-xs px-3 py-1 rounded-lg ${
              mode === "chats"
                ? "bg-orange-500 text-white"
                : "bg-[#2b1f16]/10 hover:bg-[#2b1f16]/15 text-[#2b1f16] dark:bg-white/10 dark:hover:bg-white/20 dark:text-white"
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
                ? "bg-orange-500 text-white"
                : "bg-[#2b1f16]/10 hover:bg-[#2b1f16]/15 text-[#2b1f16] dark:bg-white/10 dark:hover:bg-white/20 dark:text-white"
            }`}
          >
            Requests
          </button>
          <button onClick={()=> setShowGroups(!showGroups)} className="text-xs px-3 py-1 rounded-full bg-white border border-black/5 shadow-sm dark:bg-white/10 dark:border-white/10">Groups</button>
          <button onClick={()=> setShowGroupModal(true)} className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] text-white shadow-md">+ Group</button>
        </div>
        <StatusList />
      </div>

      {/*  LIST */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2 pb-28">
        {selectMode && (
          <div className="flex items-center justify-between px-2 py-2 bg-indigo-600 rounded-xl text-white text-xs">
            <span>{selectedChatIds.size} selected</span>
            <div className="flex gap-2">
              <button onClick={async()=>{
                for(const id of selectedChatIds){
                  try{ const { archiveChat } = await import("../../apis/chatManagement.api"); await archiveChat(id); }catch{}
                }
                const ns=new Set(archivedIds);
                selectedChatIds.forEach(id=> ns.add(id));
                setArchivedIds(ns);
                setSelectedChatIds(new Set());
                setSelectMode(false);
              }} className="px-2 py-1 rounded-full bg-white/20">Archive</button>
              <button onClick={async()=>{
                if(!confirm(`Delete ${selectedChatIds.size} chat(s)? They will reappear when you get a new message.`)) return;
                for(const id of selectedChatIds){
                  try{ const { deleteChat } = await import("../../apis/chatManagement.api"); await deleteChat(id); }catch{}
                }
                const ns=new Set(deletedIds);
                selectedChatIds.forEach(id=> ns.add(id));
                setDeletedIds(ns);
                setSelectedChatIds(new Set());
                setSelectMode(false);
              }} className="px-2 py-1 rounded-full bg-rose-500/90 hover:bg-rose-600">Delete Chat</button>
              <button onClick={()=>{ setSelectMode(false); setSelectedChatIds(new Set()); }} className="px-2 py-1 rounded-full bg-white/10">Cancel</button>
            </div>
          </div>
        )}
        {showGroups && <GroupList onSelect={(g:any)=> onSelectChat({ _id:g._id, username:g.name, avatar:g.avatar, isGroup:true, group:g })} />}
        {mode === "requests" && <FriendRequests onAccepted={loadChats} />}

        {mode === "starred" && (
          <div className="p-4 text-center text-white/60 text-sm">⭐ Starred messages — pin a chat to star it. {chats.filter((c:any)=> c.user).length===0 ? "No chats." : `${chats.length} chats`}</div>
        )}

        {mode === "archived" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-white/80 text-sm font-semibold">Archived</h3>
              <button onClick={()=> setMode("chats")} className="text-xs text-indigo-400">Back</button>
            </div>
            {chats.filter((c:any)=> c.user && archivedIds.has(c.user._id)).length===0 ? <p className="text-white/50 text-xs p-2">No archived chats</p> : chats.filter((c:any)=> c.user && archivedIds.has(c.user._id)).map((chat:any)=>{
              const key=chat._id || chat.user._id;
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex-1"><ChatListItem user={chat.user} unreadCount={chat.unreadCount} lastMessage={chat.lastMessage?.text} lastMessageAt={chat.lastMessageAt} onClick={()=> onSelectChat(chat.user)} /></div>
                  <button onClick={async()=>{ const { unarchiveChat } = await import("../../apis/chatManagement.api"); await unarchiveChat(chat.user._id); const ns=new Set(archivedIds); ns.delete(chat.user._id); setArchivedIds(ns); }} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Unarchive</button>
                </div>
              );
            })}
          </div>
        )}

        {mode === "chats" && query && <SearchResults users={allUsers} />}

        {mode === "chats" &&
          !query &&
          chats
            .filter((chat:any) => chat?.user && !archivedIds.has(chat.user._id) && !deletedIds.has(chat.user._id))
            .map((chat:any) => {
              const key = chat._id || chat.user._id;

              return (
                <div key={key} className="flex items-center gap-1">
                  {selectMode && <input type="checkbox" checked={selectedChatIds.has(chat.user._id)} onChange={e=>{ const ns=new Set(selectedChatIds); if(e.target.checked) ns.add(chat.user._id); else ns.delete(chat.user._id); setSelectedChatIds(ns); }} className="accent-indigo-600" />}
                  <div className="flex-1"><ChatListItem
                  user={chat.user}
                  unreadCount={chat.unreadCount || 0}
                  lastMessage={chat.lastMessage?.text}
                  lastMessageAt={chat.lastMessageAt}
                  isMuted={mutedIds.has(chat.user._id)}
                  isPinned={false}
                  onArchived={(id:string)=> { const ns=new Set(archivedIds); ns.add(id); setArchivedIds(ns); }}
                  onClick={() => {
                    if(selectMode){
                      const ns=new Set(selectedChatIds);
                      if(ns.has(chat.user._id)) ns.delete(chat.user._id); else ns.add(chat.user._id);
                      setSelectedChatIds(ns);
                      return;
                    }
                    setChats((prev:any) =>
                      prev.map((c:any) =>
                        (c._id || c.user?._id) === key
                          ? { ...c, unreadCount: 0 }
                          : c
                      )
                    );
                    onSelectChat(chat.user);
                  }}
                /></div>
                </div>
              );
            })}
        {mode==="chats" && !query && !selectMode && (
          <button onClick={()=> setMode("archived")} className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm mt-2">
            <span className="flex items-center gap-2">📦 Archived</span>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{archivedIds.size}</span>
          </button>
        )}
      </div>
      <CreateGroupModal open={showGroupModal} onClose={()=> setShowGroupModal(false)} onCreated={loadChats} />

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
