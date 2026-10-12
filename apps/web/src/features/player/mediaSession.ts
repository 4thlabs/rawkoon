export function clearMediaSession() {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = null;
  for (const action of [
    "play",
    "pause",
    "seekbackward",
    "seekforward",
    "previoustrack",
    "nexttrack",
  ] as const) {
    try {
      navigator.mediaSession.setActionHandler(action, null);
    } catch {
      // Some browsers reject individual handlers.
    }
  }
}
