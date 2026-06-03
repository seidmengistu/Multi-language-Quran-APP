"use client";

import { useState, type ReactNode } from "react";
import { Download, Check, Share } from "lucide-react";
import { usePwaInstall } from "./usePwaInstall";
import { useT } from "@/lib/i18n/I18nProvider";

/**
 * A self-contained "App" section for the Settings page that lets users install
 * the PWA at any time (a persistent alternative to the home banner). Renders
 * nothing on browsers that can't install and aren't iOS.
 */
export function InstallSettingsRow() {
  const t = useT();
  const { canInstall, isIOS, isStandalone, promptInstall } = usePwaInstall();
  const [showIosHint, setShowIosHint] = useState(false);

  // Nothing to offer on unsupported desktop browsers.
  if (!isStandalone && !canInstall && !isIOS) return null;

  let row: ReactNode;
  if (isStandalone) {
    row = (
      <div className="flex w-full items-center gap-3 px-4 py-3.5">
        <Check className="h-5 w-5 text-primary" />
        <span className="flex-1 text-sm font-semibold text-foreground">
          {t("install.installed")}
        </span>
      </div>
    );
  } else if (canInstall) {
    row = (
      <button
        onClick={() => promptInstall()}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <Download className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-foreground">
            {t("install.title")}
          </span>
          <span className="block text-xs text-muted-foreground">{t("install.sub")}</span>
        </span>
        <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          {t("install.button")}
        </span>
      </button>
    );
  } else {
    // iOS Safari — reveal the manual Share → Add to Home Screen hint.
    row = (
      <button
        onClick={() => setShowIosHint((s) => !s)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <Share className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-foreground">
            {t("install.title")}
          </span>
          <span className="block text-xs text-muted-foreground">
            {showIosHint ? t("install.ios_hint") : t("install.sub")}
          </span>
        </span>
      </button>
    );
  }

  return (
    <>
      <h2 className="px-1 pb-2 pt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("settings.app")}
      </h2>
      <div className="card">{row}</div>
    </>
  );
}
