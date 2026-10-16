import type {
  ActiveDownloadItem,
  PendingReleaseItem,
} from "@rawkoon/shared/types";

export type QueueStatus =
  | "downloading"
  | "waiting"
  | "importing"
  | "stalled"
  | "failed";

export type QueueReason =
  | { kind: "transfer"; speed: number; etaSeconds: number | null }
  | { kind: "grabIn"; seconds: number; candidates: number }
  | { kind: "grabDue"; candidates: number }
  | { kind: "paused" }
  | { kind: "importing" }
  | { kind: "stalled" }
  | { kind: "failed" };

export interface QueueRow {
  key: string;
  status: QueueStatus;
  reason: QueueReason;
  mediaId: number;
  title: string;
  season: number | null;
  episode: number | null;
  releaseTitle: string;
  posterUrl: string | null;
  /** 0..1 for rows that have a transfer; null for held grabs. */
  progress: number | null;
  /** Set on held grabs, which can be pulled forward. */
  targetKey?: string;
}

/** Maps the download client's state string onto one plain status; wave 4 moves this to the server. */
export function statusForDownload(item: ActiveDownloadItem): QueueStatus {
  const state = item.state.toLowerCase();
  if (state === "error") return "failed";
  if (state === "stalled") return "stalled";
  if (state === "paused") return "waiting";
  if (state === "completed" || item.progress >= 1) return "importing";
  return "downloading";
}

function reasonForDownload(
  item: ActiveDownloadItem,
  status: QueueStatus,
): QueueReason {
  switch (status) {
    case "failed":
      return { kind: "failed" };
    case "stalled":
      return { kind: "stalled" };
    case "waiting":
      return { kind: "paused" };
    case "importing":
      return { kind: "importing" };
    default:
      return {
        kind: "transfer",
        speed: item.download_speed,
        etaSeconds: item.eta_seconds,
      };
  }
}

export function buildQueueRows(
  active: ActiveDownloadItem[],
  pending: PendingReleaseItem[],
  now: number,
): QueueRow[] {
  const downloads = active.map<QueueRow>((item) => {
    const status = statusForDownload(item);
    return {
      key: `dl-${item.id}`,
      status,
      reason: reasonForDownload(item, status),
      mediaId: item.media_id,
      title: item.media_title,
      season: item.season,
      episode: item.episode,
      releaseTitle: item.release_title,
      posterUrl: item.poster_url,
      progress: item.progress,
    };
  });

  const held = pending.map<QueueRow>((item) => {
    const seconds = Math.round(
      (new Date(item.grab_after).getTime() - now) / 1000,
    );
    return {
      key: `held-${item.target_key}`,
      status: "waiting",
      reason:
        seconds > 0
          ? { kind: "grabIn", seconds, candidates: item.candidate_count }
          : { kind: "grabDue", candidates: item.candidate_count },
      mediaId: item.media_id,
      title: item.media_title,
      season: item.season,
      episode: item.episode,
      releaseTitle: item.release_title,
      posterUrl: item.poster_url,
      progress: null,
      targetKey: item.target_key,
    };
  });

  return [...downloads, ...held];
}

export type QueueFilter = "all" | QueueStatus;

export function countByStatus(rows: QueueRow[]): Record<QueueFilter, number> {
  const counts: Record<QueueFilter, number> = {
    all: rows.length,
    downloading: 0,
    waiting: 0,
    importing: 0,
    stalled: 0,
    failed: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}
