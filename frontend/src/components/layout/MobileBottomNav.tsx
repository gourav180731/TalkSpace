import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Search,
  Plus,
  Bell,
  User,
} from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { useGlobalCall } from "../../context/CallContext";

type NavKey = "home" | "search" | "notifications" | "profile";

type Props = {
  active: NavKey;
  onNewChat?: () => void;
  visible?: boolean;
};

type NavItem = {
  key: NavKey;
  icon: React.ElementType;
  label: string;
  route: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "home",          icon: MessageCircle, label: "Chats",   route: "/dashboard"     },
  { key: "search",        icon: Search,        label: "Search",  route: "/search"        },
  { key: "notifications", icon: Bell,          label: "Alerts",  route: "/notifications" },
  { key: "profile",       icon: User,          label: "Profile", route: "/profile"       },
];

export default function MobileBottomNav({
  active,
  onNewChat,
  visible = true,
}: Props) {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { callStatus } = useGlobalCall();
  const isInCall = callStatus === "calling" || callStatus === "ringing" || callStatus === "connected";

  const handleNewChat = () => {
    if (onNewChat) onNewChat();
    else navigate("/dashboard?newChat=1");
  };

  return (
    <nav
      aria-label="Main navigation"
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2
        w-[calc(100%-2rem)] max-w-[420px]
        h-[68px]
        z-[100] sm:hidden
        transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${visible && !isInCall
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-28 opacity-0 pointer-events-none"
        }
      `}
    >
      {/* Glass pill */}
      <div
        className="
          relative w-full h-full
          rounded-[22px]
          bg-[#0d0d12]/80
          border border-white/[0.08]
          shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
          backdrop-blur-2xl
          flex items-center
          px-3
        "
      >
        {/* Nav buttons + FAB */}
        <div className="relative flex w-full items-center justify-between">

          {/* LEFT two items */}
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <NavButton
              key={item.key}
              item={item}
              isActive={active === item.key}
              onClick={() => navigate(item.route)}
            />
          ))}

          {/* CENTER FAB */}
          <button
            onClick={handleNewChat}
            aria-label="New chat"
            className="
              relative mx-1
              w-[52px] h-[52px]
              rounded-[16px]
              bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-500
              flex items-center justify-center
              shadow-[0_4px_20px_rgba(139,92,246,0.55)]
              hover:shadow-[0_4px_28px_rgba(139,92,246,0.75)]
              hover:scale-105
              active:scale-95
              transition-all duration-200
              group
              -mt-3
            "
          >
            {/* Inner shine */}
            <span className="
              absolute inset-[1px] rounded-[15px]
              bg-gradient-to-b from-white/20 to-transparent
              pointer-events-none
            " />
            <Plus
              size={22}
              strokeWidth={2.5}
              className="text-white relative z-10 group-hover:rotate-90 transition-transform duration-300"
            />
          </button>

          {/* RIGHT two items */}
          {NAV_ITEMS.slice(2).map((item) => (
            <NavButton
              key={item.key}
              item={item}
              isActive={active === item.key}
              onClick={() => navigate(item.route)}
              badge={item.key === "notifications" && unreadCount > 0 ? unreadCount : undefined}
            />
          ))}

        </div>
      </div>
    </nav>
  );
}

/* ── Sub-component ─────────────────────────────────────────────────────────── */

type NavButtonProps = {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
};

function NavButton({ item, isActive, onClick, badge }: NavButtonProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      className="
        relative flex flex-col items-center justify-center gap-[3px]
        w-[52px] h-full py-1
        group
        transition-all duration-200
        active:scale-90
      "
    >
      {/* Icon */}
      <span
        className={`
          relative flex items-center justify-center
          w-8 h-8
          transition-all duration-300
          ${isActive
            ? "text-white scale-110"
            : "text-white/40 group-hover:text-white/70 group-hover:scale-105"
          }
        `}
      >
        <Icon
          size={20}
          strokeWidth={isActive ? 0 : 1.8}
          fill={isActive ? "currentColor" : "none"}
          className="transition-all duration-300"
        />

        {/* Notification badge */}
        {badge !== undefined && (
          <span
            className="
              absolute -top-1 -right-1
              min-w-[16px] h-4 px-[3px]
              flex items-center justify-center
              text-[10px] font-bold leading-none
              bg-red-500 text-white
              rounded-full
              border border-[#0d0d12]
            "
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>

      {/* Label */}
      <span
        className={`
          text-[9px] font-medium tracking-wide
          transition-all duration-300
          ${isActive ? "text-white/90" : "text-white/30 group-hover:text-white/50"}
        `}
      >
        {item.label}
      </span>

    </button>
  );
}