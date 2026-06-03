"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { TimingSegment } from "@/lib/audio-api";

interface ActiveWord {
  verseKey: string;
  wordPosition: number;
}

interface UseAudioSyncResult {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  activeWord: ActiveWord | null;
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  stop: () => void;
  seek: (fraction: number) => void;
  seekToSeconds: (seconds: number) => void;
  setLoop: (loop: boolean) => void;
}

/**
 * Custom hook that synchronizes audio playback with word-level timing segments.
 */
export function useAudioSync(segments: TimingSegment[]): UseAudioSyncResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const [activeWord, setActiveWord] = useState<ActiveWord | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Binary search to find the active segment at a given time (ms)
  const findActiveSegment = useCallback(
    (timeMs: number): TimingSegment | null => {
      if (segments.length === 0) return null;

      let lo = 0;
      let hi = segments.length - 1;
      let result: TimingSegment | null = null;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (segments[mid].startMs <= timeMs) {
          result = segments[mid];
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      if (result && timeMs >= result.startMs && timeMs <= result.endMs) {
        return result;
      }
      return null;
    },
    [segments]
  );

  // Animation loop for smooth highlighting
  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;

    const timeMs = audio.currentTime * 1000;

    const seg = findActiveSegment(timeMs);
    if (seg) {
      // Only update on an actual word change so long surahs don't re-render
      // every animation frame. (currentTime is tracked via `timeupdate`.)
      setActiveWord((prev) =>
        prev && prev.verseKey === seg.verseKey && prev.wordPosition === seg.wordPosition
          ? prev
          : { verseKey: seg.verseKey, wordPosition: seg.wordPosition }
      );
    }

    // eslint-disable-next-line react-hooks/immutability -- self-referencing requestAnimationFrame loop is intentional
    animFrameRef.current = requestAnimationFrame(tick);
  }, [findActiveSegment]);

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, tick]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      if (!audio.loop) {
        setIsPlaying(false);
        setActiveWord(null);
      }
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    audio.play()?.catch(() => {});
  }, []);

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (!audio.src) return;
      audio.play()?.catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setActiveWord(null);
  }, []);

  const setLoop = useCallback((loop: boolean) => {
    const audio = audioRef.current;
    if (audio) audio.loop = loop;
    setIsLooping(loop);
  }, []);

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = fraction * audio.duration;
  }, []);

  // Seek to an absolute position (used to start playback at a given ayah).
  const seekToSeconds = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, seconds);
    setCurrentTime(audio.currentTime);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    audioRef,
    activeWord,
    isPlaying,
    isLooping,
    currentTime,
    duration,
    progress,
    play,
    pause,
    toggle,
    stop,
    seek,
    seekToSeconds,
    setLoop,
  };
}
