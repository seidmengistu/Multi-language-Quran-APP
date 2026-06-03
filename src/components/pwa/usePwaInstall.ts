"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type WindowWithBip = Window & {
  __bipEvent?: BeforeInstallPromptEvent | null;
  MSStream?: unknown;
};

/**
 * Reactive access to PWA install state. Reflects the `beforeinstallprompt`
 * event captured in <head> (Android/Chromium), iOS Safari (which has no
 * programmatic prompt), and whether the app is already installed.
 */
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const w = window as WindowWithBip;
    const nav = navigator as Navigator & { standalone?: boolean };

    /* eslint-disable react-hooks/set-state-in-effect -- read platform/install state on mount; must run client-side to avoid a hydration mismatch */
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !w.MSStream);
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        nav.standalone === true
    );
    setCanInstall(!!w.__bipEvent);
    /* eslint-enable react-hooks/set-state-in-effect */

    const sync = () => setCanInstall(!!w.__bipEvent);
    window.addEventListener("bip-ready", sync);
    return () => window.removeEventListener("bip-ready", sync);
  }, []);

  async function promptInstall(): Promise<boolean> {
    const w = window as WindowWithBip;
    const evt = w.__bipEvent;
    if (!evt) return false;
    await evt.prompt();
    const choice = await evt.userChoice;
    w.__bipEvent = null;
    window.dispatchEvent(new Event("bip-ready"));
    return choice.outcome === "accepted";
  }

  return { canInstall, isIOS, isStandalone, promptInstall };
}
