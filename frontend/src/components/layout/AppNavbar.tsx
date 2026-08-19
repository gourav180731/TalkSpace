import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import ThemeToggle from "../../utils/theme.tsx";

type Props = {
  active?: "home" | "profile" | "notifications";
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
    `relative transition ${
      active === key
        ? "text-[#2b1f16] font-semibold dark:text-white"
        : "text-[#2b1f16]/70 hover:text-[#2b1f16] dark:text-white/70 dark:hover:text-white"
    }`;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 w-[93%] max-w-6xl backdrop-blur-xl bg-white/70 border border-orange-200/60 shadow-lg rounded-2xl px-6 py-3 flex justify-between items-center z-[100] dark:bg-white/25 dark:border-white/30">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => go("/dashboard")}
      >
        <img
          src="/talkspace-icon.svg"
          alt="TalkSpace"
          className="w-7 h-7 rounded-lg"
        />
        <span
          className="text-[#2b1f16] text-xl font-bold tracking-wide dark:text-white"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          TalkSpace
        </span>
      </div>

      <div className="hidden sm:flex gap-6 items-center font-medium">
        <button onClick={() => go("/dashboard")} className={tabClass("home")}>
          Home
        </button>

        <button onClick={() => go("/profile")} className={tabClass("profile")}>
          Profile
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