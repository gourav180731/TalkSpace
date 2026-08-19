import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";

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
        ? "text-white font-semibold"
        : "text-white/70 hover:text-white"
    }`;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 w-[93%] max-w-6xl backdrop-blur-xl bg-white/25 border border-white/30 shadow-lg rounded-2xl px-6 py-3 flex justify-between items-center z-[100]">
      <h1
        className="text-white text-xl font-bold cursor-pointer"
        onClick={() => go("/dashboard")}
      >
        ChitChat
      </h1>

      <div className="hidden sm:flex gap-6 items-center text-white font-medium">
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
            <span className="absolute -top-1 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="text-red-300 hover:text-red-400"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
