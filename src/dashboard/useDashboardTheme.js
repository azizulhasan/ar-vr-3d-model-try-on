import { useEffect, useState } from "react";

/**
 * Dark/light theme for the dashboard screens.
 *
 * Writes the `--theme-*` variables every dashboard component reads and
 * remembers the choice in localStorage. Shared by the dashboard (App)
 * and the setup wizard (AR-72).
 */
export const applyTheme = (dark) => {
  if (dark) {
    document.documentElement.style.setProperty("--theme-bg", "#1e1e1e");
    document.documentElement.style.setProperty("--theme-text", "#ffffff");
    document.documentElement.style.setProperty("--theme-accent", "#333333");
  } else {
    document.documentElement.style.setProperty("--theme-bg", "#ffffff");
    document.documentElement.style.setProperty("--theme-text", "#000000");
    document.documentElement.style.setProperty("--theme-accent", "#e5e5e5");
  }
  localStorage.setItem("isDarkMode", dark ? "true" : "false");
};

export default function useDashboardTheme() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const dark = localStorage.getItem("isDarkMode") === "true";
    setIsDarkMode(dark);
    applyTheme(dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    applyTheme(next);
  };

  return [isDarkMode, toggleTheme];
}
