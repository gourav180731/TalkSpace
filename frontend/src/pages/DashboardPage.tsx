import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Sidebar from "../components/dashboard/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import EmptyState from "../components/dashboard/EmptyState";
import AppNavbar from "../components/layout/AppNavbar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { useScrollDirection } from "../utils/useScrollDirection";

export default function DashboardPage() {
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [showFriendsPicker, setShowFriendsPicker] = useState(false);
  const isMobileChatOpen = Boolean(selectedChat);

  const [searchParams, setSearchParams] = useSearchParams();
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  const navVisible = useScrollDirection(sidebarScrollRef);

  useEffect(() => {
    if (searchParams.get("newChat") === "1") {
      setShowFriendsPicker(true);

      const next = new URLSearchParams(searchParams);
      next.delete("newChat");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0b0d12]">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/20 blur-[140px]" />
      <div className="absolute top-40 -right-40 w-[400px] h-[400px] bg-blue-500/20 blur-[140px]" />

      {/* Grid */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-20" />

      {/* DESKTOP NAVBAR */}
      <div className="hidden md:block fixed top-1 left-1/2 -translate-x-1/2 w-[94%] max-w-6xl z-[100]">
        <AppNavbar />
      </div>

      <div className="relative z-10 md:pt-24">
        <div
          className="
            max-w-7xl mx-auto
            h-[calc(100vh)] md:h-[calc(100vh-8rem)]
            overflow-hidden
            md:rounded-3xl
            bg-[#121520]/90
            backdrop-blur-xl
            border border-white/10
            shadow-2xl shadow-black/40
          "
        >
          <div className="h-full grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]">
            {/* SIDEBAR (SCROLLS) */}
            <div ref={sidebarScrollRef} className="h-full min-h-0">
              <Sidebar
                onSelectChat={setSelectedChat}
                showFriendsPicker={showFriendsPicker}
                setShowFriendsPicker={setShowFriendsPicker}
              />
            </div>

            {/* DESKTOP CHAT */}
            <div className="hidden md:flex flex-col min-h-0 w-full">
              {selectedChat ? (
                <ChatWindow
                  chat={selectedChat}
                  onBack={() => setSelectedChat(null)}
                />
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE CHAT FULLSCREEN */}
      {selectedChat && (
        <div className="md:hidden fixed inset-0 z-[60] bg-[#0b0d12]">
          <ChatWindow
            chat={selectedChat}
            onBack={() => setSelectedChat(null)}
          />
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      {!isMobileChatOpen && !showFriendsPicker && (
        <MobileBottomNav
          active="home"
          visible={navVisible}
          onNewChat={() => setShowFriendsPicker(true)}
        />
      )}
    </div>
  );
}
