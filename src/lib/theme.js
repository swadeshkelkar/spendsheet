// Light / dark mode.
//
// The user picks "system", "light" or "dark" in Settings. It's a choice about
// this device (your phone might be dark while your laptop is light), so it's
// saved in the browser, not with your expenses.
//
// The actual switch is one attribute on <html>: data-theme="light" or "dark".
// theme.css has a set of colors for each.

const STORAGE_KEY = "spendsheet:theme";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

// The saved choice. Anything missing or unexpected counts as "system".
export function getThemeChoice() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

// Sets data-theme on <html> for a choice. "system" asks the device.
export function applyTheme(choice) {
  const dark = choice === "dark" || (choice === "system" && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

// Saves a new choice and applies it straight away.
export function setThemeChoice(choice) {
  localStorage.setItem(STORAGE_KEY, choice);
  applyTheme(choice);
}

// When set to "system", follow the device if it switches while the app is
// open (for example, phones that go dark at sunset). Call this once at start-up.
export function followSystemTheme() {
  darkQuery.addEventListener("change", () => {
    if (getThemeChoice() === "system") {
      applyTheme("system");
    }
  });
}
