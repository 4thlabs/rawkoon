import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { MediaPostProcessingTab } from "@/pages/settings/_component/MediaPostProcessingTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

/** Scrolls to and focuses the element a fix link points at, waiting for the form to render. */
function useScrollToHash() {
  const hash = useRouterState({ select: (s) => s.location.hash });
  useEffect(() => {
    const id = hash.replace(/^#/, "");
    if (!id) return;
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      tries += 1;
      if (el) {
        clearInterval(timer);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus({ preventScroll: true });
      } else if (tries >= 40) {
        clearInterval(timer);
      }
    }, 150);
    return () => clearInterval(timer);
  }, [hash]);
}

export function LibrarySettingsPage() {
  useScrollToHash();
  return (
    <SettingsPageShell id="library">
      <MediaPostProcessingTab />
    </SettingsPageShell>
  );
}
