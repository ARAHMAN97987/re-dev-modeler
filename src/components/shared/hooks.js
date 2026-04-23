// Extracted from App.jsx line 3270-3278
// Custom hooks shared across components

import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// Persistent theme hook — light/dark, syncs to localStorage + <html data-theme>.
// Cross-component sync: every mounted instance listens to a 'haseefThemeChange'
// CustomEvent, so flipping from ProjectsDashboard updates ReDevModelerInner live.
// Returns [theme, toggleTheme] where theme is 'light' | 'dark'.
const THEME_KEY = "haseefTheme";
const THEME_EVENT = "haseefThemeChange";
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"; }
    catch (_) { return "light"; }
  });
  useEffect(() => {
    const onChange = (e) => setTheme(e.detail === "dark" ? "dark" : "light");
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
    try { document.documentElement.setAttribute("data-theme", next); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next })); } catch (_) {}
  };
  return [theme, toggleTheme];
}
