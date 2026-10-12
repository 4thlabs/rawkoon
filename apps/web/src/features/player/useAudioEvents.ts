import { useEffect, type MutableRefObject } from "react";
import type { BookManifestFile } from "@rawkoon/shared/types";
import type { LoadedBook, PlaybackRate } from "./playerTypes";

const PUT_THROTTLE_MS = 10_000;

type AudioEventsArgs = {
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  loadedRef: MutableRefObject<LoadedBook | null>;
  currentFileRef: MutableRefObject<BookManifestFile | null>;
  pendingOffsetRef: MutableRefObject<number | null>;
  wantPlayRef: MutableRefObject<boolean>;
  lastPutAtRef: MutableRefObject<number>;
  positionRef: MutableRefObject<number>;
  playingRef: MutableRefObject<boolean>;
  rateRef: MutableRefObject<PlaybackRate>;
  seekingRef: MutableRefObject<boolean>;
  setError: (next: string | null) => void;
  setChapterMarker: (position: number) => void;
  flushProgress: (finished?: boolean) => Promise<void>;
  retryGrantOrError: () => Promise<void>;
  seekInternal: (raw: number, playAfter: boolean) => void;
  setPlaying: (next: boolean) => void;
  setPosition: (next: number) => void;
};

export function useAudioEvents({
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
}: AudioEventsArgs) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are owned by the provider and read at event time.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      const offset = pendingOffsetRef.current;
      if (offset != null) {
        audio.currentTime = offset;
        pendingOffsetRef.current = null;
      }
      audio.playbackRate = rateRef.current;
      if (wantPlayRef.current) {
        void audio.play().then(
          () => setPlaying(true),
          () => setError("play"),
        );
      }
    };

    const onTimeUpdate = () => {
      const book = loadedRef.current;
      const file = currentFileRef.current;
      if (!book || !file) return;
      const position = file.start_secs + audio.currentTime;
      setPosition(position);
      // The item can span many chapters (single-file book), so advance the
      // marker as playback crosses chapter boundaries within the file.
      setChapterMarker(position);
      if (
        playingRef.current &&
        Date.now() - lastPutAtRef.current >= PUT_THROTTLE_MS
      ) {
        void flushProgress();
      }
      if (
        "mediaSession" in navigator &&
        document.visibilityState === "visible"
      ) {
        try {
          navigator.mediaSession.setPositionState({
            duration: book.timeline.totalDurationSecs,
            playbackRate: rateRef.current,
            position: Math.min(position, book.timeline.totalDurationSecs),
          });
        } catch {
          // Duration 0 throws in some browsers.
        }
      }
    };

    const onEnded = () => {
      const book = loadedRef.current;
      if (!book) return;
      // A file (not a chapter) ended: the <audio> element only fires `ended` at
      // the physical file's end. Advance to the next file, or finish the book.
      const nextStart = book.fileIndex.boundaryAfterFile(positionRef.current);
      if (nextStart == null) {
        setPlaying(false);
        setPosition(book.timeline.totalDurationSecs);
        void flushProgress(true);
        return;
      }
      seekInternal(nextStart, true);
    };

    const onError = () => {
      void retryGrantOrError();
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => {
      // A cross-chapter seek or auto-advance swaps `audio.src` and calls
      // `load()`, which fires `pause` asynchronously — after `seek` has already
      // reset `seekingRef`. `pendingOffsetRef` stays non-null until the new
      // chapter's metadata loads, so it covers that async window too.
      if (seekingRef.current || pendingOffsetRef.current != null) return;
      setPlaying(false);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [
    setChapterMarker,
    flushProgress,
    retryGrantOrError,
    seekInternal,
    setPlaying,
    setPosition,
  ]);
}
