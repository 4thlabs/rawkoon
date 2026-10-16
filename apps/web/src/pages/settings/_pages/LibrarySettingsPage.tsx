import { useEffect } from "react";
import { MediaPostProcessingTab } from "@/pages/settings/_component/MediaPostProcessingTab";
import { SettingsPageShell } from "@/pages/settings/_component/SettingsPageShell";

/** Opens at the element a fix link points to, once the form has rendered. */
function useScrollToHash() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(timer);
  }, []);
}

export function LibrarySettingsPage() {
  useScrollToHash();
  return (
    <SettingsPageShell id="library">
      <MediaPostProcessingTab />
    </SettingsPageShell>
  );
}
