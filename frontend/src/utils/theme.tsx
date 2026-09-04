import { useState, useEffect } from "react";
import { toggleTheme, getStoredTheme } from "../utils/theme";

export default function ThemeToggle() {
  const [theme, setThemeState] = useState(getStoredTheme());

  useEffect(()=>{
    const h=()=> setThemeState(getStoredTheme());
    window.addEventListener("theme-change", h);
    window.addEventListener("storage", h);
    return()=>{ window.removeEventListener("theme-change", h); window.removeEventListener("storage", h); };
  },[]);

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
      {(theme as string) === "dark" ? "☀️ Light" : (theme as string)==="light" ? "🌙 Dark" : "🖥️ Auto"}
    </button>
  );
}

export function MobileThemeSelector(){
  const [theme,setThemeState]=useState(getStoredTheme());
  useEffect(()=>{
    const h=()=> setThemeState(getStoredTheme());
    window.addEventListener("theme-change", h);
    return()=> window.removeEventListener("theme-change",h);
  },[]);
  const set = (t:any)=>{
    import("../utils/theme").then(m=>{ m.setTheme(t); setThemeState(t); window.dispatchEvent(new Event("theme-change")); });
    // also persist to backend if logged in
    import("../apis/settings.api").then(m=> m.updateUserSettings({theme:t}).catch(()=>{}));
  };
  return (
    <div className="flex gap-2">
      {["light","dark","auto"].map(v=>(
        <button key={v} onClick={()=> set(v)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize border transition ${theme===v?"bg-indigo-600 text-white border-indigo-500":"bg-white/5 hover:bg-white/10 border-white/10 text-white"}`}>{v}</button>
      ))}
    </div>
  );
}
