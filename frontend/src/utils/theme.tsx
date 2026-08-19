import { useState } from "react";
import { getTheme, toggleTheme } from "../utils/theme";

export default function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme());

  const onToggle = () => {
    const next = toggleTheme();
    setThemeState(next);
    window.dispatchEvent(new Event("theme-change"));
  };

  return (
    <button
      onClick={onToggle}
      className="
        px-3 py-2 rounded-lg
        bg-white/10 dark:bg-white/5
        text-white dark:text-white/90
        hover:bg-white/20 transition
      "
    >
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
