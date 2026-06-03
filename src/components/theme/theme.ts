"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

export const THEME_KEY = "tartil:theme";
const THEME_EVENT = "tartil:theme-change";

/**
 * Inline script injected into <head> so the correct theme is applied before
 * the first paint (no flash of the wrong colour scheme). Kept dependency-free
 * and stored as a raw string (not JSON) for the simplest possible read.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){}})();`;

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function applyTheme(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  el.style.colorScheme = dark ? "dark" : "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as ThemeMode) || "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate theme from localStorage after mount
    setThemeState(stored);
    setHydrated(true);

    const onChange = () => {
      const next = (localStorage.getItem(THEME_KEY) as ThemeMode) || "system";
      setThemeState(next);
      applyTheme(next);
    };
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if ((localStorage.getItem(THEME_KEY) as ThemeMode) === "system" ||
          !localStorage.getItem(THEME_KEY)) {
        applyTheme("system");
      }
    };
    window.addEventListener(THEME_EVENT, onChange);
    mq.addEventListener("change", onSystem);
    return () => {
      window.removeEventListener(THEME_EVENT, onChange);
      mq.removeEventListener("change", onSystem);
    };
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    localStorage.setItem(THEME_KEY, mode);
    setThemeState(mode);
    applyTheme(mode);
    window.dispatchEvent(new CustomEvent(THEME_EVENT));
  }, []);

  return { theme, setTheme, hydrated };
}
