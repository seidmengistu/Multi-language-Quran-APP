"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once the page has loaded. Mounted globally in
 * the root layout. Registration enables offline support and lets browsers
 * offer the app for installation.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* registration failures are non-fatal */
      });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
