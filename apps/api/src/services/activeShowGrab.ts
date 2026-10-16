import { prisma } from "@rawkoon/api/db";

export const SHOW_GRAB_ACTIVE_PREFIX =
  "A complete-series download is already active";

const inFlight = {
  episodeId: null,
  season: null,
  completedAt: null,
  failed: false,
} as const;

/**
 * Whether a show-level grab (no episode, no season: a complete-series pack) is
 * still downloading or importing. Its episodes stay "wanted" until the import
 * lands, so every episode- or season-level search must stand down meanwhile.
 */
export async function hasActiveShowGrab(mediaId: number): Promise<boolean> {
  const row = await prisma.downloadHistory.findFirst({
    where: { mediaId, ...inFlight },
    select: { id: true },
  });
  return row != null;
}

/** The subset of `mediaIds` that has a show-level grab in flight. */
export async function mediaIdsWithActiveShowGrab(
  mediaIds: number[],
): Promise<Set<number>> {
  if (mediaIds.length === 0) return new Set();
  const rows = await prisma.downloadHistory.findMany({
    where: { mediaId: { in: mediaIds }, ...inFlight },
    select: { mediaId: true },
  });
  return new Set(rows.flatMap((r) => (r.mediaId == null ? [] : [r.mediaId])));
}
