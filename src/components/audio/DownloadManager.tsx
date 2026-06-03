"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Trash2,
  Check,
  Pause,
  Play,
  X,
  Loader2,
  RotateCcw,
  HardDrive,
} from "lucide-react";
import type { SurahMeta } from "@/lib/surahs.server";
import { StarBadge } from "@/components/ui/StarBadge";
import { useT } from "@/lib/i18n/I18nProvider";

const TOTAL = 114;

function fmtSize(bytes: number): string {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

type State = "queued" | "downloading" | "failed";

function ProgressRing({ percent, size = 64 }: { percent: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-foreground">{percent}%</span>
    </span>
  );
}

export function DownloadManager({
  reciterId,
  reciterName,
  surahs,
}: {
  reciterId: number;
  reciterName: string;
  surahs: SurahMeta[];
}) {
  const t = useT();
  const [downloaded, setDownloaded] = useState<Set<number>>(new Set());
  const [sizes, setSizes] = useState<Record<number, number>>({});
  const [totalBytes, setTotalBytes] = useState(0);
  const [states, setStates] = useState<Record<number, State>>({});
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  const queueRef = useRef<number[]>([]);
  const pausedRef = useRef(false);
  const cancelRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/audio/status?reciterId=${reciterId}`);
      const data = await res.json();
      if (res.ok) {
        setDownloaded(new Set<number>(data.downloaded ?? []));
        setSizes(data.sizes ?? {});
        setTotalBytes(data.totalBytes ?? 0);
      }
    } catch {
      /* offline — leave as is */
    }
  }, [reciterId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setState = (ch: number, s: State | null) =>
    setStates((prev) => {
      const next = { ...prev };
      if (s) next[ch] = s;
      else delete next[ch];
      return next;
    });

  const downloadChapter = useCallback(
    async (ch: number) => {
      setState(ch, "downloading");
      try {
        const res = await fetch("/api/audio/download", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reciterId, chapterId: ch }),
        });
        if (!res.ok) throw new Error();
        await refresh();
        setState(ch, null);
        return true;
      } catch {
        setState(ch, "failed");
        return false;
      }
    },
    [reciterId, refresh]
  );

  const processQueue = useCallback(async () => {
    setRunning(true);
    cancelRef.current = false;
    while (queueRef.current.length > 0) {
      if (cancelRef.current) break;
      if (pausedRef.current) {
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      const ch = queueRef.current[0];
      await downloadChapter(ch);
      queueRef.current = queueRef.current.slice(1);
    }
    setRunning(false);
    setPaused(false);
    pausedRef.current = false;
  }, [downloadChapter]);

  const downloadAll = () => {
    const todo = surahs.map((s) => s.id).filter((id) => !downloaded.has(id));
    if (todo.length === 0) return;
    queueRef.current = todo;
    setStates((prev) => {
      const next = { ...prev };
      todo.forEach((id) => (next[id] = "queued"));
      return next;
    });
    processQueue();
  };

  const pause = () => {
    pausedRef.current = true;
    setPaused(true);
  };
  const resume = () => {
    pausedRef.current = false;
    setPaused(false);
  };
  const cancel = () => {
    cancelRef.current = true;
    queueRef.current = [];
    setStates({});
    setRunning(false);
    setPaused(false);
    pausedRef.current = false;
  };

  const removeChapter = async (ch: number) => {
    setState(ch, "downloading");
    try {
      await fetch("/api/audio/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reciterId, chapterId: ch }),
      });
      await refresh();
    } finally {
      setState(ch, null);
    }
  };

  const removeAll = async () => {
    if (running) cancel();
    await fetch("/api/audio/remove", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reciterId, removeAll: true }),
    });
    await refresh();
  };

  const doneCount = downloaded.size;
  const percent = Math.round((doneCount / TOTAL) * 100);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-4">
      {/* Summary card */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <ProgressRing percent={percent} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-foreground">{reciterName}</p>
            <p className="text-sm text-muted-foreground">
              {t("dl.downloaded_of", { done: doneCount })}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <HardDrive className="h-3.5 w-3.5" />
              {t("dl.space_used", { size: fmtSize(totalBytes) })}
            </p>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.max(percent, doneCount ? 2 : 0)}%` }}
          />
        </div>

        <div className="mt-4 flex gap-2.5">
          {!running ? (
            <button
              onClick={downloadAll}
              disabled={doneCount >= TOTAL}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.99] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {t("dl.download_all")}
            </button>
          ) : (
            <>
              <button
                onClick={paused ? resume : pause}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {paused ? <Play className="h-4 w-4" fill="currentColor" /> : <Pause className="h-4 w-4" />}
                {paused ? t("dl.resume") : t("dl.pause")}
              </button>
              <button
                onClick={cancel}
                className="flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground"
              >
                <X className="h-4 w-4" />
                {t("dl.cancel")}
              </button>
            </>
          )}
          {!running && doneCount > 0 && (
            <button
              onClick={removeAll}
              className="flex items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t("dl.remove_all")}
            </button>
          )}
        </div>
      </div>

      {/* Surah list */}
      <h2 className="px-1 pb-2 pt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("dl.surahs")}
      </h2>
      <div className="card divide-y divide-border">
        {surahs.map((s) => {
          const isDone = downloaded.has(s.id);
          const st = states[s.id];
          return (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              <StarBadge n={s.id} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {s.nameEnglish}
                </p>
                <p className="text-xs text-muted-foreground">
                  {st === "downloading"
                    ? t("dl.state_downloading")
                    : st === "queued"
                    ? t("dl.state_queued")
                    : st === "failed"
                    ? t("dl.state_failed")
                    : isDone
                    ? `${t("dl.state_done")} · ${fmtSize(sizes[s.id] ?? 0)}`
                    : s.nameTranslation}
                </p>
              </div>

              {st === "downloading" ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : st === "queued" ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {t("dl.state_queued")}
                </span>
              ) : st === "failed" ? (
                <button
                  onClick={() => downloadChapter(s.id)}
                  aria-label={t("dl.retry")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              ) : isDone ? (
                <div className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-success" />
                  <button
                    onClick={() => removeChapter(s.id)}
                    aria-label={t("common.remove")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => downloadChapter(s.id)}
                  aria-label={t("common.download")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
                >
                  <Download className="h-5 w-5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
