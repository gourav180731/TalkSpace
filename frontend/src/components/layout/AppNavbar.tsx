import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import ThemeToggle from "../../utils/theme.tsx";

type Props = {
  active?: "home" | "profile" | "notifications" | "call-history";
};

export default function AppNavbar({
  active = "home",
}: Props) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { unreadCount } = useNotifications(); 

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const go = (path: string) => {
    navigate(path);
  };

  const tabClass = (key: string) =>
    `nav-link relative transition text-sm font-medium ${
      active === key
        ? "text-white font-semibold"
        : "text-white/70 hover:text-white"
    }`;

  return (
    <div className="fixed top-1 left-1/2 -translate-x-1/2 w-[94%] max-w-6xl bg-[#0b0d12]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl px-6 py-3 flex justify-between items-center z-[100] transition duration-300 dark:bg-[#0b0d12]/80 light:light-navbar">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => go("/dashboard")}
      >
        <img
          src="/talkspace-icon.svg"
          alt="TalkSpace"
          className="w-7 h-7 rounded-xl"
        />
        <span className="ts-wordmark text-2xl">TalkSpace</span>
      </div>

      <div className="hidden sm:flex gap-6 items-center font-medium">
        <button onClick={() => go("/dashboard")} className={tabClass("home")}>
          Home
        </button>

        <button onClick={() => go("/call-history")} className={tabClass("call-history" as any)}>
          Call History
        </button>

        <button
          onClick={() => go("/notifications")}
          className={tabClass("notifications")}
        >
          Notifications
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
              {unreadCount}
            </span>
          )}
        </button>
        <button onClick={()=> go("/settings")} className={tabClass("settings" as any)}>Settings</button>

        <ThemeToggle />

        <button
          onClick={handleLogout}
          className="text-red-500 hover:text-red-600 dark:text-red-300 dark:hover:text-red-400"
        >
          Logout
        </button>
      </div>
    </div>
  );
}