import { useEffect } from "react";
import { clearMediaSession } from "./mediaSession";

export function useFlushOnHide(
  flushProgress: (finished?: boolean) => Promise<void>,
) {
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      void flushProgress();
      clearMediaSession();
    };
    const onPageHide = () => {
      void flushProgress();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [flushProgress]);
}
