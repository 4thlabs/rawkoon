import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { BookManifestFile } from "@rawkoon/shared/types";
import { queryKeys } from "@/lib/queryKeys";
import { createTimeline } from "./timeline";
import { createFileIndex } from "./fileIndex";
import { webDeviceId } from "./deviceId";
import {
  fetchBookCover,
  fetchListeningProgress,
  fetchManifest,
  putListeningProgress,
} from "./usePlayback";
import {
  PLAYBACK_RATES,
  type LoadedBook,
  type PlaybackRate,
  type PlayerContextValue,
} from "./playerTypes";
import { clearMediaSession } from "./mediaSession";
import { useAudioEvents } from "./useAudioEvents";
import { useFlushOnHide } from "./useFlushOnHide";
import { useMediaSessionControls } from "./useMediaSessionControls";

export { PLAYBACK_RATES, type PlaybackRate, type PlayerContextValue };

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used inside PlayerProvider");
  }
  return ctx;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadedRef = useRef<LoadedBook | null>(null);
  const chapterIndexRef = useRef<number | null>(null);
  const currentFileRef = useRef<BookManifestFile | null>(null);
  const pendingOffsetRef = useRef<number | null>(null);
  const wantPlayRef = useRef(false);
  const grantRetriedRef = useRef(false);
  const lastPutAtRef = useRef(0);
  const positionRef = useRef(0);
  const playingRef = useRef(false);
  const rateRef = useRef<PlaybackRate>(1);
  const loadGenRef = useRef(0);
  const seekingRef = useRef(false);

  const [loaded, setLoaded] = useState<LoadedBook | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionSecs, setPositionSecs] = useState(0);
  const [rate, setRateState] = useState<PlaybackRate>(1);
  const [error, setError] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState<number | null>(null);

  const setPlaying = useCallback((next: boolean) => {
    playingRef.current = next;
    setIsPlaying(next);
  }, []);

  const setPosition = useCallback((next: number) => {
    positionRef.current = next;
    setPositionSecs(next);
  }, []);

  // The chapter is only a timeline marker now; the file is the audio unit. Keep
  // the exposed chapter index in sync with the whole-book position.
  const setChapterMarker = useCallback((position: number) => {
    const book = loadedRef.current;
    const index = book?.timeline.chapterAt(position)?.index ?? null;
    if (chapterIndexRef.current !== index) {
      chapterIndexRef.current = index;
      setChapterIndex(index);
    }
  }, []);

  const flushProgress = useCallback(
    async (finished = false) => {
      const book = loadedRef.current;
      if (!book) return;
      lastPutAtRef.current = Date.now();
      try {
        await putListeningProgress(book.editionId, {
          position_secs: positionRef.current,
          total_duration_secs: book.timeline.totalDurationSecs,
          finished,
          updated_at: new Date().toISOString(),
          device_id: webDeviceId(),
        });
        void qc.invalidateQueries({ queryKey: queryKeys.books.progress() });
      } catch {
        // Retry on the next tick or pause; playback does not stop.
      }
    },
    [qc],
  );

  const applyFile = useCallback(
    (
      file: BookManifestFile,
      offsetSecs: number,
      playAfter: boolean,
      force = false,
    ) => {
      const audio = audioRef.current;
      if (!audio) return;
      const sameFile =
        !force && currentFileRef.current?.id === file.id && Boolean(audio.src);
      if (currentFileRef.current?.id !== file.id) {
        grantRetriedRef.current = false;
      }
      currentFileRef.current = file;
      wantPlayRef.current = playAfter;
      if (sameFile) {
        audio.currentTime = offsetSecs;
        if (playAfter) void audio.play().catch(() => setError("play"));
        return;
      }
      pendingOffsetRef.current = offsetSecs;
      audio.src = file.url;
      audio.load();
    },
    [],
  );

  const seekInternal = useCallback(
    (raw: number, playAfter: boolean) => {
      const book = loadedRef.current;
      if (!book) return;
      const position = book.timeline.clamp(raw);
      setPosition(position);
      setChapterMarker(position);
      const file = book.fileIndex.fileAt(position);
      if (!file) {
        const files = book.fileIndex.files;
        const last = files[files.length - 1];
        if (!last) return;
        const offset = Math.max(last.duration_secs - 0.05, 0);
        applyFile(last, offset, false);
        setPlaying(false);
        audioRef.current?.pause();
        return;
      }
      applyFile(file, position - file.start_secs, playAfter);
    },
    [applyFile, setChapterMarker, setPlaying, setPosition],
  );

  const load = useCallback(
    async (editionId: number, bookId: number) => {
      const gen = ++loadGenRef.current;
      setIsLoading(true);
      setError(null);
      try {
        const [manifest, progress, coverUrl] = await Promise.all([
          fetchManifest(editionId),
          fetchListeningProgress(),
          fetchBookCover(bookId).catch(() => null),
        ]);
        if (gen !== loadGenRef.current) return;
        const timeline = createTimeline(manifest.chapters);
        const fileIndex = createFileIndex(manifest.files);
        const row = progress.progress.find((p) => p.edition_id === editionId);
        const book: LoadedBook = {
          editionId,
          bookId,
          title: manifest.title,
          authors: manifest.authors,
          coverUrl: coverUrl ?? row?.cover_url ?? null,
          manifest,
          timeline,
          fileIndex,
        };
        loadedRef.current = book;
        setLoaded(book);
        const start = timeline.clamp(row?.position_secs ?? 0);
        seekInternal(start, false);
      } catch {
        if (gen !== loadGenRef.current) return;
        setError("load");
      } finally {
        if (gen === loadGenRef.current) setIsLoading(false);
      }
    },
    [seekInternal],
  );

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !loadedRef.current) return;
    setError(null);
    void audio.play().then(
      () => setPlaying(true),
      () => setError("play"),
    );
  }, [setPlaying]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
    void flushProgress();
  }, [flushProgress, setPlaying]);

  const seek = useCallback(
    (positionSecs: number) => {
      seekingRef.current = true;
      seekInternal(positionSecs, playingRef.current);
      void flushProgress();
      seekingRef.current = false;
    },
    [flushProgress, seekInternal],
  );

  const skip = useCallback(
    (deltaSecs: number) => {
      seek(positionRef.current + deltaSecs);
    },
    [seek],
  );

  const nextChapter = useCallback(() => {
    const book = loadedRef.current;
    if (!book) return;
    const next = book.timeline.boundaryAfter(positionRef.current);
    if (next == null) return;
    seek(next);
  }, [seek]);

  const prevChapter = useCallback(() => {
    const book = loadedRef.current;
    if (!book) return;
    const prev = book.timeline.boundaryBefore(positionRef.current);
    seek(prev ?? 0);
  }, [seek]);

  const setRate = useCallback((next: PlaybackRate) => {
    rateRef.current = next;
    setRateState(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, []);

  const unload = useCallback(() => {
    loadGenRef.current += 1;
    audioRef.current?.pause();
    void flushProgress();
    if (audioRef.current) {
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    loadedRef.current = null;
    chapterIndexRef.current = null;
    currentFileRef.current = null;
    setLoaded(null);
    setPlaying(false);
    setPosition(0);
    setChapterIndex(null);
    setError(null);
    setIsLoading(false);
    clearMediaSession();
  }, [flushProgress, setPlaying, setPosition]);

  const retryGrantOrError = useCallback(async () => {
    const book = loadedRef.current;
    const file = currentFileRef.current;
    if (!book || !file) return;
    if (grantRetriedRef.current) {
      setError("chapter");
      setPlaying(false);
      return;
    }
    grantRetriedRef.current = true;
    try {
      const manifest = await fetchManifest(book.editionId);
      const timeline = createTimeline(manifest.chapters);
      const fileIndex = createFileIndex(manifest.files);
      const refreshed: LoadedBook = { ...book, manifest, timeline, fileIndex };
      loadedRef.current = refreshed;
      setLoaded(refreshed);
      const next = fileIndex.fileAt(positionRef.current);
      if (!next) {
        setError("chapter");
        return;
      }
      const offset = Math.max(positionRef.current - next.start_secs, 0);
      applyFile(next, offset, playingRef.current, true);
    } catch {
      setError("chapter");
      setPlaying(false);
    }
  }, [applyFile, setPlaying]);

  useAudioEvents({
    audioRef,
    loadedRef,
    currentFileRef,
    pendingOffsetRef,
    wantPlayRef,
    lastPutAtRef,
    positionRef,
    playingRef,
    rateRef,
    seekingRef,
    setError,
    setChapterMarker,
    flushProgress,
    retryGrantOrError,
    seekInternal,
    setPlaying,
    setPosition,
  });

  useFlushOnHide(flushProgress);

  useMediaSessionControls(loaded, play, pause, skip, prevChapter, nextChapter);

  const value = useMemo<PlayerContextValue>(
    () => ({
      loaded: loaded != null,
      editionId: loaded?.editionId ?? null,
      bookId: loaded?.bookId ?? null,
      title: loaded?.title ?? null,
      authors: loaded?.authors ?? [],
      coverUrl: loaded?.coverUrl ?? null,
      chapters: loaded?.timeline.chapters ?? [],
      currentChapterIndex: chapterIndex,
      isPlaying,
      isLoading,
      positionSecs,
      durationSecs: loaded?.timeline.totalDurationSecs ?? 0,
      rate,
      error,
      load,
      play,
      pause,
      seek,
      skip,
      nextChapter,
      prevChapter,
      setRate,
      unload,
    }),
    [
      loaded,
      chapterIndex,
      isPlaying,
      isLoading,
      positionSecs,
      rate,
      error,
      load,
      play,
      pause,
      seek,
      skip,
      nextChapter,
      prevChapter,
      setRate,
      unload,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      <audio ref={audioRef} preload="metadata" className="hidden" aria-hidden />
      {children}
    </PlayerContext.Provider>
  );
}
