"use client";

import {
  ArrowRightToLine,
  ArrowLeftToLine,
  Users,
  Repeat,
  ChevronRight,
  Play,
} from "lucide-react";
import { Reciter } from "@/lib/reciters";
import { useT } from "@/lib/i18n/I18nProvider";

interface AudioSettingsModalProps {
  onClose: () => void;
  onPlay: () => void;
  currentChapterId: number;
  currentChapterName?: string;
  ayahCount: number;
  startAyah: number;
  endAyah: number;
  startLabel?: string;
  endLabel?: string;
  onChangeStart: (n: number) => void;
  onChangeEnd: (n: number) => void;
  currentReciter: Reciter;
  onChooseReciter: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
}

export function AudioSettingsModal({
  onClose,
  onPlay,
  currentChapterId,
  currentChapterName,
  ayahCount,
  startAyah,
  endAyah,
  onChangeStart,
  onChangeEnd,
  currentReciter,
  onChooseReciter,
  isLooping,
  onToggleLoop,
}: AudioSettingsModalProps) {
  const t = useT();
  const name = currentChapterName ?? `Surah ${currentChapterId}`;
  const clampAyah = (v: string) =>
    Math.min(ayahCount, Math.max(1, Number(v) || 1));

  return (
    <div className="audio-modal-overlay" onClick={onClose}>
      <div className="audio-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-border-strong" />
        <div className="audio-modal-header text-center">
          <span className="text-sm font-semibold text-muted-foreground">
            {t("audio.recitation")} · {name}
          </span>
        </div>

        <div>
          {/* Start ayah — type the number */}
          <div className="audio-settings-item" style={{ cursor: "default" }}>
            <div className="flex items-center gap-3">
              <ArrowRightToLine className="h-4 w-4 text-muted-foreground" />
              <span>{t("audio.start")}</span>
            </div>
            <label className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">{name}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={ayahCount}
                value={startAyah}
                onChange={(e) => onChangeStart(clampAyah(e.target.value))}
                className="audio-ayah-input"
                aria-label="Start ayah"
              />
            </label>
          </div>

          {/* End ayah — type the number */}
          <div className="audio-settings-item" style={{ cursor: "default" }}>
            <div className="flex items-center gap-3">
              <ArrowLeftToLine className="h-4 w-4 text-muted-foreground" />
              <span>{t("audio.end")}</span>
            </div>
            <label className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm">{name}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={ayahCount}
                value={endAyah}
                onChange={(e) => onChangeEnd(clampAyah(e.target.value))}
                className="audio-ayah-input"
                aria-label="End ayah"
              />
            </label>
          </div>

          {/* Reciter — opens the reciter picker */}
          <button className="audio-settings-item w-full" onClick={onChooseReciter}>
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{t("audio.reciter")}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-sm">{currentReciter.name}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>

          {/* Repeat — loops the selected range */}
          <button
            className="audio-settings-item w-full"
            onClick={onToggleLoop}
            aria-pressed={isLooping}
          >
            <div className="flex items-center gap-3">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <span className="text-left">
                <span className="block">{t("audio.repeat")}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("audio.repeat_sub")}
                </span>
              </span>
            </div>
            <span className="switch" data-on={isLooping} />
          </button>
        </div>

        <div className="p-5">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-bold text-primary-foreground transition-transform active:scale-[0.99]"
            onClick={onPlay}
          >
            <Play className="h-5 w-5" fill="currentColor" /> {t("audio.play")}
          </button>
        </div>
      </div>
    </div>
  );
}
