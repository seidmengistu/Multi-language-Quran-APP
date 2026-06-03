"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "./theme";
import { useT } from "@/lib/i18n/I18nProvider";

const MODES: { mode: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

/** Compact icon button that cycles Light → Dark → System (for the app header). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, hydrated } = useTheme();
  const current = MODES.find((m) => m.mode === theme) ?? MODES[2];
  const Icon = current.Icon;
  const next = MODES[(MODES.findIndex((m) => m.mode === theme) + 1) % MODES.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next.mode)}
      aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
      title={`Theme: ${current.label}`}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/15 ${className}`}
    >
      {/* Render a stable icon during SSR to avoid hydration mismatch */}
      <Icon className="h-5 w-5" style={{ opacity: hydrated ? 1 : 0.9 }} />
    </button>
  );
}

/** Three-way segmented control used on the Settings screen. */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const t = useT();
  return (
    <div className="segmented w-full">
      {MODES.map(({ mode, Icon }) => (
        <button
          key={mode}
          type="button"
          data-active={theme === mode}
          onClick={() => setTheme(mode)}
          className="segmented-item inline-flex items-center justify-center gap-1.5"
        >
          <Icon className="h-4 w-4" />
          {t(`theme.${mode}`)}
        </button>
      ))}
    </div>
  );
}
