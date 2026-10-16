import { prisma } from "@rawkoon/api/db";
import { parseReleaseSeasonSpan } from "@rawkoon/shared/utils/releaseStructure";

export const SHOW_GRAB_ACTIVE_PREFIX =
  "A complete-series download is already active";

/** A completed grab that never reports its import is only trusted to be importing this long. */
const IMPORT_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Whether a season is carried by an in-flight show-level grab. */
export type SeasonCover = (season: number) => boolean;

/**
 * Show-level rows (no episode, no season) that still own their episodes: the
 * download is running, or it completed and its import hasn't reported yet
 * (no destination, skip or error). Episodes stay "wanted" until the import
 * lands, so season and episode searches must stand down meanwhile.
 */
const inFlight = () => ({
  episodeId: null,
  season: null,
  failed: false,
  OR: [
    { completedAt: null },
    {
      completedAt: { gte: new Date(Date.now() - IMPORT_WINDOW_MS) },
      postProcessDestinationPath: null,
      postProcessSkipReason: null,
      postProcessError: null,
    },
  ],
});

/** A ranged pack ("S01-S03") carries only its seasons; a complete-series label carries them all. */
function coverOf(releaseTitles: string[]): SeasonCover {
  const spans = releaseTitles.map((t) => parseReleaseSeasonSpan(t));
  return (season) =>
    spans.some((s) => s == null || (season >= s.from && season <= s.to));
}

/** Per show, the seasons its in-flight show-level grabs carry; shows without one are absent. */
export async function activeShowGrabCovers(
  mediaIds: number[],
): Promise<Map<number, SeasonCover>> {
  if (mediaIds.length === 0) return new Map();
  const rows = await prisma.downloadHistory.findMany({
    where: { ...inFlight(), mediaId: { in: mediaIds } },
    select: { mediaId: true, releaseTitle: true },
  });
  const titles = new Map<number, string[]>();
  for (const r of rows) {
    if (r.mediaId == null) continue;
    titles.set(r.mediaId, [...(titles.get(r.mediaId) ?? []), r.releaseTitle]);
  }
  return new Map([...titles].map(([id, t]) => [id, coverOf(t)]));
}

/** The seasons a show's in-flight show-level grab carries, or null when there is none. */
export async function activeShowGrabCover(
  mediaId: number,
): Promise<SeasonCover | null> {
  return (await activeShowGrabCovers([mediaId])).get(mediaId) ?? null;
}
