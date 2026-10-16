import { prisma } from "@rawkoon/api/db";
import { resolveActiveAdapter } from "@rawkoon/api/services/downloadClient/registry";
import { revertToWantedIfNoActiveGrabs } from "@rawkoon/api/services/downloadOutcome";
import { emitLibraryUpdate } from "@rawkoon/api/services/libraryEvents";

export const REPLACED_FAIL_REASON = "Replaced by another release";

/**
 * Stop a movie's running download so another release can take its place.
 *
 * The torrent goes first because the one-active-grab-per-target index would
 * refuse the new grab otherwise; if the new grab then fails, the old download
 * is already gone. Rows are kept as failed history, without the failure
 * notification a genuine failure sends.
 */
export async function cancelActiveMovieDownloads(
  mediaId: number,
): Promise<{ cancelled: number }> {
  const rows = await prisma.downloadHistory.findMany({
    where: { mediaId, episodeId: null, completedAt: null, failed: false },
    select: { id: true, mediaId: true, episodeId: true, torrentHash: true },
  });

  const active = rows.some((r) => r.torrentHash)
    ? await resolveActiveAdapter()
    : null;

  for (const row of rows) {
    if (row.torrentHash && active) {
      const sharedWithOthers = await prisma.downloadHistory.count({
        where: {
          torrentHash: row.torrentHash,
          id: { not: row.id },
          failed: false,
        },
      });
      // Best-effort: a torrent already gone from the client shouldn't block the swap.
      await active.adapter
        .remove(row.torrentHash, sharedWithOthers === 0)
        .catch(() => {});
    }
    await prisma.downloadHistory.update({
      where: { id: row.id },
      data: { failed: true, failReason: REPLACED_FAIL_REASON },
    });
    await revertToWantedIfNoActiveGrabs(row);
  }

  // A stale "downloading" status with no active row would still block the grab.
  await prisma.libraryMedia.updateMany({
    where: { id: mediaId, status: "downloading" },
    data: { status: "wanted" },
  });
  emitLibraryUpdate(mediaId);
  return { cancelled: rows.length };
}
