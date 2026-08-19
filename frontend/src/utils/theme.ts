export type Theme = "light" | "dark";

export const getTheme = (): Theme => {
  return (localStorage.getItem("theme") as Theme) ?? "dark";
};

export const setTheme = (theme: Theme) => {
  localStorage.setItem("theme", theme);

  const html = document.documentElement;

  if (theme === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
};

export const toggleTheme = (): Theme => {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
};
