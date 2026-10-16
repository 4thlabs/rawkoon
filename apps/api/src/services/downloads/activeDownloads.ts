import { prisma } from "@rawkoon/api/db";
import { estimateEtaSeconds } from "@rawkoon/api/services/downloadClient/eta";
import type { NormalizedTorrent } from "@rawkoon/api/services/downloadClient/types";
import type { ActiveDownloadItem } from "@rawkoon/shared/types";

export interface ActiveGrabRow {
  id: number;
  releaseTitle: string;
  torrentHash: string | null;
  season: number | null;
  media: {
    id: number;
    title: string;
    type: string;
    posterUrl: string | null;
  } | null;
  episode: { season: number; episode: number } | null;
}

/**
 * Join in-flight grabs to their torrents by hash. A grab whose torrent the
 * client doesn't report is left out: there are no live numbers to show for it.
 */
export function buildActiveDownloads(
  rows: ActiveGrabRow[],
  torrents: NormalizedTorrent[],
): ActiveDownloadItem[] {
  const byHash = new Map(torrents.map((t) => [t.hash.toLowerCase(), t]));
  const items: ActiveDownloadItem[] = [];
  for (const row of rows) {
    if (!row.media || !row.torrentHash) continue;
    const torrent = byHash.get(row.torrentHash.toLowerCase());
    if (!torrent) continue;
    items.push({
      id: row.id,
      media_id: row.media.id,
      media_title: row.media.title,
      media_type: row.media.type === "movie" ? "movie" : "show",
      poster_url: row.media.posterUrl,
      season: row.episode?.season ?? row.season,
      episode: row.episode?.episode ?? null,
      release_title: row.releaseTitle,
      progress: torrent.progress,
      state: torrent.state,
      download_speed: Math.max(0, torrent.dlSpeed),
      eta_seconds: estimateEtaSeconds(torrent),
    });
  }
  return items;
}

/** Grabs still in flight for movies and shows, oldest first. */
export function loadActiveGrabRows(): Promise<ActiveGrabRow[]> {
  return prisma.downloadHistory.findMany({
    where: {
      completedAt: null,
      failed: false,
      torrentHash: { not: null },
      mediaId: { not: null },
    },
    orderBy: { grabbedAt: "asc" },
    select: {
      id: true,
      releaseTitle: true,
      torrentHash: true,
      season: true,
      media: {
        select: { id: true, title: true, type: true, posterUrl: true },
      },
      episode: { select: { season: true, episode: true } },
    },
  });
}
