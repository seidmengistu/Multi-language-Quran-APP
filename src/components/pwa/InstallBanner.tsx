"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "./usePwaInstall";
import { useT } from "@/lib/i18n/I18nProvider";

const DISMISS_KEY = "tartil:pwa-dismissed";

/**
 * A dismissible "Install app" banner shown on the home screen. On Android /
 * Chromium it triggers the native install prompt; on iOS Safari (which has no
 * programmatic prompt) it shows the Share → Add to Home Screen hint. Hidden
 * once the app is installed (running standalone) or after the user dismisses it.
 */
export function InstallBanner() {
  const t = useT();
  const { canInstall, isIOS, isStandalone, promptInstall } = usePwaInstall();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal after mount to avoid hydration flicker
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function handleInstall() {
    const accepted = await promptInstall();
    if (accepted) dismiss();
  }

  // Avoid hydration flicker; only decide after mount.
  if (!mounted || isStandalone || dismissed) return null;
  // Nothing actionable to show on browsers that can't install.
  if (!canInstall && !isIOS) return null;

  return (
    <div
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 pr-10 text-white shadow-md"
      style={{
        background: "linear-gradient(135deg, var(--header-from), var(--header-to))",
      }}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
        <Download className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{t("install.title")}</p>
        <p className="mt-0.5 text-xs leading-snug text-white/80">
          {isIOS && !canInstall ? t("install.ios_hint") : t("install.sub")}
        </p>
      </div>
      {canInstall && (
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-full bg-[#f3e7c6] px-3.5 py-1.5 text-sm font-semibold text-[#0a4d3c] active:translate-y-px"
        >
          {t("install.button")}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label={t("install.dismiss")}
        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
