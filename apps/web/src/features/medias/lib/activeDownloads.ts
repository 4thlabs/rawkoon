import type {
  ActiveDownloadsResponse,
  DownloadProgressItem,
  DownloadProgressSummaryResponse,
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

/** Same overlay for the user-visible progress summary behind the status chips. */
export function mergeSummaryProgress(
  current: DownloadProgressSummaryResponse | undefined,
  progress: DownloadProgressItem[],
): DownloadProgressSummaryResponse | undefined {
  if (!current || progress.length === 0) return current;
  const byId = new Map(progress.map((p) => [p.id, p]));
  return {
    items: current.items.map((row) => {
      const live = byId.get(row.id);
      return live ? { ...row, progress: live.progress } : row;
    }),
  };
}

export interface MediaDownloadProgress {
  /** Whole percent of the in-flight grabs, floored so a nearly-done grab never claims 100. */
  percent: number;
  /** In-flight grabs for the title; more than one means a show with several episodes going. */
  count: number;
}

/**
 * Progress for a title. A show can have several episodes in flight, and only
 * those are averaged (finished ones are gone from the list), so the chip uses
 * `count` to say "3 episodes" instead of a percent that would mislead.
 */
export function downloadProgressForMedia(
  data: DownloadProgressSummaryResponse | undefined,
  mediaId: number,
): MediaDownloadProgress | null {
  const mine = data?.items.filter((i) => i.media_id === mediaId) ?? [];
  if (mine.length === 0) return null;
  const mean = mine.reduce((sum, i) => sum + i.progress, 0) / mine.length;
  return {
    percent: Math.min(99, Math.max(0, Math.floor(mean * 100))),
    count: mine.length,
  };
}

/** The longest ETA among a title's in-flight grabs, or null when none reports one. */
export function etaForMedia(
  data: ActiveDownloadsResponse | undefined,
  mediaId: number,
): number | null {
  const etas = (data?.items ?? [])
    .filter((row) => row.media_id === mediaId)
    .flatMap((row) => (row.eta_seconds != null ? [row.eta_seconds] : []));
  return etas.length > 0 ? Math.max(...etas) : null;
}
