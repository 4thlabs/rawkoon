import type {
  ActiveDownloadsResponse,
  DownloadProgressItem,
} from "@rawkoon/shared/types";

/**
 * Overlay pushed live progress onto the cached active-downloads list, keyed by
 * download_history id. Rows the push doesn't mention keep their numbers; a push
 * for an unknown id is ignored (the media-update event refetches the list).
 * Returns a new object so React Query sees a fresh reference.
 */
export function mergeActiveProgress(
  current: ActiveDownloadsResponse | undefined,
  progress: DownloadProgressItem[],
): ActiveDownloadsResponse | undefined {
  if (!current || progress.length === 0) return current;

  const byId = new Map(progress.map((p) => [p.id, p]));
  return {
    ...current,
    items: current.items.map((row) => {
      const live = byId.get(row.id);
      if (!live) return row;
      return {
        ...row,
        progress: live.progress,
        state: live.state,
        download_speed: live.downloadSpeed,
        eta_seconds: live.etaSeconds,
      };
    }),
  };
}

/**
 * Whole-number percent for a title, averaged over its active grabs (a show can
 * have several episodes in flight). Null when nothing is downloading for it.
 * Floors so a nearly-done grab never claims 100%.
 */
export function downloadPercentForMedia(
  data: ActiveDownloadsResponse | undefined,
  mediaId: number,
): number | null {
  const mine = data?.items.filter((i) => i.media_id === mediaId) ?? [];
  if (mine.length === 0) return null;
  const mean = mine.reduce((sum, i) => sum + i.progress, 0) / mine.length;
  return Math.min(99, Math.max(0, Math.floor(mean * 100)));
}
