import { useEffect } from "react";
import { clearMediaSession } from "./mediaSession";
import type { LoadedBook } from "./playerTypes";

export function useMediaSessionControls(
  loaded: LoadedBook | null,
  play: () => void,
  pause: () => void,
  skip: (deltaSecs: number) => void,
  prevChapter: () => void,
  nextChapter: () => void,
) {
  useEffect(() => {
    if (!loaded || document.visibilityState !== "visible") {
      if (!loaded) clearMediaSession();
      return;
    }
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: loaded.title,
      artist: loaded.authors.join(", "),
      artwork: loaded.coverUrl
        ? [{ src: loaded.coverUrl, sizes: "512x512" }]
        : [],
    });
    navigator.mediaSession.setActionHandler("play", () => play());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => skip(-30));
    navigator.mediaSession.setActionHandler("seekforward", () => skip(30));
    navigator.mediaSession.setActionHandler("previoustrack", () =>
      prevChapter(),
    );
    navigator.mediaSession.setActionHandler("nexttrack", () => nextChapter());
  }, [loaded, play, pause, skip, prevChapter, nextChapter]);
}
