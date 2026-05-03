type Theme = "dark" | "light" | "system";

const isBrowser = typeof window !== "undefined";

const stored = isBrowser
  ? ((localStorage.getItem("theme") as Theme) ?? "dark")
  : "dark";

let current = $state<Theme>(stored);

function applyTheme(theme: Theme) {
  if (!isBrowser) return;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export const theme = {
  get current() {
    return current;
  },
  set(newTheme: Theme) {
    current = newTheme;
    if (isBrowser) localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  },
  init() {
    applyTheme(current);
  },
};
