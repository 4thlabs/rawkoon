import { prisma } from "@rawkoon/api/db";
import { resolveActiveAdapter } from "@rawkoon/api/services/downloadClient/registry";
import { revertToWantedIfNoActiveGrabs } from "@rawkoon/api/services/downloadOutcome";
import { emitLibraryUpdate } from "@rawkoon/api/services/libraryEvents";
import { REPLACED_FAIL_REASON } from "@rawkoon/api/services/replacedDownload";
import { infoHashFromMagnet } from "@rawkoon/api/utils/medias/prowlarrSearchUtils";

export { REPLACED_FAIL_REASON };

export type ReplacePrep =
  /** The running download already is the requested release; nothing to do. */
  | { status: "already_active" }
  | { status: "cancelled"; cancelled: number }
  /** Nothing was stopped (or the stop was undone); `reason` says why. */
  | { status: "refused"; reason: string };

/**
 * Stop a movie's running download so another release can take its place.
 *
 * Each row is claimed first (failed = true, only while still active), so a
 * download that completes meanwhile is never deleted. The torrent is removed
 * only after the claim; a client error other than "already gone" undoes the
 * claim and refuses. Rows are kept as failed history, without the failure
 * notification a genuine failure sends.
 *
 * The one-active-grab-per-target index forces stop-then-grab, so if the grab
 * that follows is refused the old download is already gone.
 */
export async function cancelActiveMovieDownloads(
  mediaId: number,
  release?: { releaseTitle: string; downloadUrl: string },
): Promise<ReplacePrep> {
  const rows = await prisma.downloadHistory.findMany({
    where: { mediaId, episodeId: null, completedAt: null, failed: false },
    select: {
      id: true,
      mediaId: true,
      episodeId: true,
      torrentHash: true,
      releaseTitle: true,
    },
  });

  if (release) {
    const title = release.releaseTitle.trim().toLowerCase();
    const hash = release.downloadUrl.startsWith("magnet:")
      ? infoHashFromMagnet(release.downloadUrl)?.toLowerCase()
      : null;
    const same = rows.some(
      (r) =>
        r.releaseTitle.trim().toLowerCase() === title ||
        (hash != null && r.torrentHash?.toLowerCase() === hash),
    );
    if (same) return { status: "already_active" };
  }

  const active = rows.some((r) => r.torrentHash)
    ? await resolveActiveAdapter()
    : null;
  if (rows.some((r) => r.torrentHash) && !active) {
    return { status: "refused", reason: "No download client configured" };
  }

  let cancelled = 0;
  for (const row of rows) {
    const claim = await prisma.downloadHistory.updateMany({
      where: { id: row.id, completedAt: null, failed: false },
      data: { failed: true, failReason: REPLACED_FAIL_REASON },
    });
    if (claim.count !== 1) {
      return {
        status: "refused",
        reason: "The download finished or changed while replacing it",
      };
    }

    if (row.torrentHash && active) {
      const hash = row.torrentHash;
      const sharedWithOthers = await prisma.downloadHistory.count({
        where: { torrentHash: hash, id: { not: row.id }, failed: false },
      });
      try {
        await active.adapter.remove(hash, sharedWithOthers === 0);
      } catch (error) {
        // Only a torrent the client no longer has counts as removed.
        const stillThere = await active.adapter
          .getTorrent(hash)
          .then((t) => t !== null)
          .catch(() => true);
        if (stillThere) {
          await prisma.downloadHistory.updateMany({
            where: { id: row.id },
            data: { failed: false, failReason: null },
          });
          return {
            status: "refused",
            reason: `Could not stop the running download: ${
              error instanceof Error ? error.message : "download client error"
            }`,
          };
        }
      }
    }
    await revertToWantedIfNoActiveGrabs(row);
    cancelled += 1;
  }

  // A stale "downloading" status with no active row would still block the grab.
  await prisma.libraryMedia.updateMany({
    where: { id: mediaId, status: "downloading" },
    data: { status: "wanted" },
  });
  emitLibraryUpdate(mediaId);
  return { status: "cancelled", cancelled };
}
