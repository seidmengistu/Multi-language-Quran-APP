"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  BookMarked,
  Sparkles,
  Highlighter,
  Headphones,
  Check,
  Languages,
} from "lucide-react";
import { useSettings } from "@/lib/storage";
import { ThemeSegmented } from "@/components/theme/ThemeControls";
import { MUSHAFS, DEFAULT_MUSHAF, type MushafId } from "@/lib/mushafs";
import {
  TRANSLATIONS,
  DEFAULT_TRANSLATION_ID,
  resolveTranslationId,
} from "@/lib/translations";
import { BottomNav } from "@/components/home/BottomNav";
import { InstallSettingsRow } from "@/components/pwa/InstallSettingsRow";
import { useT, useLang } from "@/lib/i18n/I18nProvider";
import { LANGS } from "@/lib/i18n/strings";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 pb-2 pt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  on,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        {subtitle && (
          <span className="block text-xs text-muted-foreground">{subtitle}</span>
        )}
      </span>
      <span className="switch" data-on={on} />
    </button>
  );
}

function LinkRow({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex w-full items-center gap-3 px-4 py-3.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        {subtitle && (
          <span className="block text-xs text-muted-foreground">{subtitle}</span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

export default function SettingsPage() {
  const t = useT();
  const router = useRouter();
  const { lang, setLang } = useLang();
  const { settings, update } = useSettings();
  const [mushafId, setMushafId] = useState<MushafId>(DEFAULT_MUSHAF);

  useEffect(() => {
    const m = document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("mushafId="))
      ?.split("=")[1] as MushafId | undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate selected mushaf from cookie after mount
    if (m && MUSHAFS.some((x) => x.id === m)) setMushafId(m);
  }, []);

  const [translationId, setTranslationId] = useState<number>(DEFAULT_TRANSLATION_ID);
  useEffect(() => {
    const raw = document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("translationId="))
      ?.split("=")[1];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate translation from cookie after mount
    setTranslationId(resolveTranslationId(raw));
  }, []);

  const chooseTranslation = async (id: number) => {
    setTranslationId(id);
    await fetch("/api/translation/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ translationId: id }),
    });
    // Re-render server components so the new translation takes effect everywhere.
    router.refresh();
  };

  const mushafName =
    MUSHAFS.find((m) => m.id === mushafId)?.title ?? MUSHAFS[0].title;

  const scale = settings.arabicFontScale;
  const setScale = (v: number) =>
    update({ arabicFontScale: Math.round(Math.min(1.6, Math.max(0.8, v)) * 10) / 10 });

  return (
    <div>
      {/* Header */}
      <header className="app-bar sticky top-0 z-30 pt-[env(safe-area-inset-top)] shadow-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-2">
          <Link
            href="/suras"
            aria-label="Back"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="flex-1 text-center text-lg font-bold">{t("settings.title")}</h1>
          <span className="w-10" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-28">
        <SectionLabel>{t("settings.appearance")}</SectionLabel>
        <div className="card divide-y divide-border">
          <div className="px-4 py-4">
            <p className="mb-2.5 text-sm font-semibold text-foreground">
              {t("settings.theme")}
            </p>
            <ThemeSegmented />
          </div>

          <div className="px-4 py-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {t("settings.arabic_font_size")}
              </p>
              <span className="text-xs font-medium text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <p
              dir="rtl"
              className="font-arabic overflow-hidden text-foreground"
              style={{ fontSize: `${1.9 * scale}rem`, lineHeight: 1.7 }}
            >
              بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
            <div className="mt-2 flex items-center gap-3">
              <button
                aria-label="Smaller"
                onClick={() => setScale(scale - 0.1)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={0.8}
                max={1.6}
                step={0.1}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="range-emerald flex-1"
                aria-label={t("settings.arabic_font_size")}
              />
              <button
                aria-label="Larger"
                onClick={() => setScale(scale + 0.1)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <LinkRow
            icon={<BookMarked className="h-5 w-5" />}
            title={t("settings.mushaf_edition")}
            subtitle={mushafName}
            href="/settings/mushaf"
          />

          <ToggleRow
            icon={<Sparkles className="h-5 w-5" />}
            title={t("settings.tajweed")}
            subtitle={t("settings.tajweed_sub")}
            on={settings.tajweed}
            onToggle={() => update({ tajweed: !settings.tajweed })}
          />
        </div>

        <SectionLabel>{t("settings.recitation")}</SectionLabel>
        <div className="card divide-y divide-border">
          <ToggleRow
            icon={<Highlighter className="h-5 w-5" />}
            title={t("settings.highlight")}
            subtitle={t("settings.highlight_sub")}
            on={settings.highlightWhilePlaying}
            onToggle={() =>
              update({ highlightWhilePlaying: !settings.highlightWhilePlaying })
            }
          />
          <LinkRow
            icon={<Headphones className="h-5 w-5" />}
            title={t("settings.audio_manager")}
            subtitle={t("settings.audio_manager_sub")}
            href="/settings/audio-manager"
          />
        </div>

        <SectionLabel>{t("settings.app_language")}</SectionLabel>
        <div className="card divide-y divide-border">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                chooseTranslation(l.translationId);
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <Languages className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {l.label}
                </span>
                <span className="block text-xs text-muted-foreground">{l.english}</span>
              </span>
              {lang === l.code && <Check className="h-5 w-5 text-primary" />}
            </button>
          ))}
        </div>

        <SectionLabel>{t("settings.translation_language")}</SectionLabel>
        <div className="card divide-y divide-border">
          {TRANSLATIONS.map((tr) => (
            <button
              key={tr.id}
              disabled={!tr.available}
              onClick={() => tr.available && chooseTranslation(tr.id)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
                !tr.available ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <span className="flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {tr.language}
                  {!tr.available && ` · ${t("read.coming_soon")}`}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {tr.nativeLabel} — {tr.name}
                </span>
              </span>
              {translationId === tr.id && tr.available && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>

        <InstallSettingsRow />

        <p className="px-1 pt-8 text-center text-xs text-muted-foreground">
          {t("settings.footer")}
        </p>
      </div>
      <BottomNav active="settings" />
    </div>
  );
}
