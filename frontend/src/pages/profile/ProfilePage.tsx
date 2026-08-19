import AppNavbar from "../../components/layout/AppNavbar";
import MobileBottomNav from "../../components/layout/MobileBottomNav";
import TopLoader from "../../components/TopLoader";
import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useScrollDirection } from "../../utils/useScrollDirection";
import { useProfile } from "./useProfile";
import { ProfileView } from "./ProfileView";

export default function ProfilePage() {
  const navigate = useNavigate();
  const navVisible = useScrollDirection();
  const profileState = useProfile();

  const { initializing, profile, handleLogout } = profileState;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0b0d12]">
      {/* Background glow */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/20 blur-[140px]" />
      <div className="absolute top-40 -right-40 w-[400px] h-[400px] bg-blue-500/20 blur-[140px]" />

      {/* Background grid */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-20" />

      {/* TOP LOADER */}
      {initializing && <TopLoader />}

      {/* DESKTOP NAVBAR */}
      <div className="hidden md:block fixed top-1 left-1/2 -translate-x-1/2 w-[94%] max-w-6xl z-[100]">
        <AppNavbar active="profile" />
      </div>

      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between px-4 py-4 text-white relative z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
          >
            <ArrowLeft />
          </button>
          <h1 className="text-lg font-semibold">Profile</h1>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>

     {/* MAIN CONTENT */}
<div className="relative z-10 px-4 md:pt-24">
  {profile ? (
      <ProfileView {...profileState} />
  ) : (
    <div className="text-white/60 text-center mt-20">
      Loading profile…
    </div>
  )}
</div>


      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden">
        <MobileBottomNav active="profile" visible={navVisible} />
      </div>
    </div>
  );
}
