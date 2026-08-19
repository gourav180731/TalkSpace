import NotificationsPanel from "../components/notifications/NotificationsPanel";
import AppNavbar from "../components/layout/AppNavbar";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { useScrollDirection } from "../utils/useScrollDirection";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const navVisible = useScrollDirection();

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0b0d12]">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/20 blur-[140px]" />
      <div className="absolute top-40 -right-40 w-[400px] h-[400px] bg-blue-500/20 blur-[140px]" />

      {/* Background grid */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-20" />

      {/* DESKTOP NAVBAR */}
      <div className="hidden md:block fixed top-1 left-1/2 -translate-x-1/2 w-[94%] max-w-6xl z-[100]">
        <AppNavbar active="notifications" />
      </div>

      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center gap-3 px-4 py-4 text-white relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-semibold">Notifications</h1>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 px-4 md:pt-24 max-w-5xl mx-auto">
       <NotificationsPanel />
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden">
        <MobileBottomNav
          active="notifications"
          visible={navVisible}
        />
      </div>
    </div>
  );
}
