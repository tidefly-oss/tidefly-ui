type Theme = "dark" | "light" | "system";

const stored =
	typeof localStorage !== "undefined"
		? ((localStorage.getItem("theme") as Theme) ?? "dark")
		: "dark";

let current = $state<Theme>(stored);

function applyTheme(theme: Theme) {
	const isDark =
		theme === "dark" ||
		(theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
	document.documentElement.classList.toggle("dark", isDark);
}

export const theme = {
	get current() {
		return current;
	},
	set(newTheme: Theme) {
		current = newTheme;
		localStorage.setItem("theme", newTheme);
		applyTheme(newTheme);
	},
	init() {
		applyTheme(current);
	},
};
