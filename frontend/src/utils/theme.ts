export type Theme = "light" | "dark" | "auto";

export const getSystemTheme = (): "light" | "dark" =>
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const getStoredTheme = (): Theme => {
  return (localStorage.getItem("theme") as Theme) ?? "dark";
};

export const getTheme = (): Theme => getStoredTheme();

export const getEffectiveTheme = (): "light" | "dark" => {
  const t = getStoredTheme();
  if (t === "auto") return getSystemTheme();
  return t as "light"|"dark";
};

export const applyTheme = (theme: Theme) => {
  localStorage.setItem("theme", theme);
  const effective = theme === "auto" ? getSystemTheme() : theme;
  const html = document.documentElement;
  if (effective === "dark") html.classList.add("dark");
  else html.classList.remove("dark");
};

export const setTheme = (theme: Theme) => {
  applyTheme(theme);
};

export const toggleTheme = (): Theme => {
  const cur = getStoredTheme();
  const next: Theme = cur === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
};

// Initialize theme on load
if (typeof window !== "undefined") {
  applyTheme(getStoredTheme());
  // listen system changes when auto
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (getStoredTheme() === "auto") applyTheme("auto");
  });
}
