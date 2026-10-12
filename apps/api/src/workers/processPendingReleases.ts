import { prisma } from "@rawkoon/api/db";
import { grabRelease } from "@rawkoon/api/services/mediaGrabberGrab";
import {
  profileToScoreInput,
  qualityProfileFormatsInclude,
} from "@rawkoon/api/services/mediaGrabberHelpers";
import type { NormalizedRelease } from "@rawkoon/api/services/indexerManager/types";
import { scoreReleasesForProfile } from "@rawkoon/api/utils/medias/pickBestRelease";

/** Rows older than this are leftovers from a target that never came due. */
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type PendingRow = {
  targetKey: string;
  mediaId: number;
  episodeId: number | null;
  season: number | null;
  release: unknown;
  score: number;
};

// The column is written only by evaluateDelay from a NormalizedRelease.
const asRelease = (v: unknown) => v as NormalizedRelease;

/** True while nothing has satisfied the target: still monitored, wanted, and fileless. */
async function isStillWanted(row: PendingRow): Promise<boolean> {
  if (row.episodeId != null) {
    const ep = await prisma.libraryEpisode.findUnique({
      where: { id: row.episodeId },
      select: {
        monitored: true,
        status: true,
        media: { select: { monitored: true } },
        _count: { select: { files: true } },
      },
    });
    return Boolean(
      ep &&
        ep.monitored &&
        ep.media.monitored &&
        ep.status === "wanted" &&
        ep._count.files === 0,
    );
  }
  const media = await prisma.libraryMedia.findUnique({
    where: { id: row.mediaId },
    select: {
      monitored: true,
      status: true,
      _count: { select: { files: true } },
    },
  });
  if (!media?.monitored) return false;
  if (row.season != null) {
    const wanted = await prisma.libraryEpisode.count({
      where: {
        mediaId: row.mediaId,
        season: row.season,
        monitored: true,
        status: "wanted",
        files: { none: {} },
      },
    });
    return wanted > 0;
  }
  return media.status === "wanted" && media._count.files === 0;
}

/**
 * Grab the best held release for every target whose delay window has ended.
 * Targets that were satisfied or unmonitored meanwhile are dropped without a grab.
 */
export async function processPendingReleases(
  now = new Date(),
): Promise<{ grabbed: number; dropped: number }> {
  await prisma.pendingRelease.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - PENDING_TTL_MS) } },
  });

  const due = await prisma.pendingRelease.findMany({
    where: { grabAfter: { lte: now } },
    select: { targetKey: true },
    distinct: ["targetKey"],
  });

  let grabbed = 0;
  let dropped = 0;
  for (const { targetKey } of due) {
    try {
      const rows = await prisma.pendingRelease.findMany({
        where: { targetKey },
        select: {
          targetKey: true,
          mediaId: true,
          episodeId: true,
          season: true,
          release: true,
          score: true,
        },
      });
      const first = rows[0];
      if (!first) continue;

      if (!(await isStillWanted(first))) {
        await prisma.pendingRelease.deleteMany({ where: { targetKey } });
        dropped++;
        continue;
      }

      const media = await prisma.libraryMedia.findUnique({
        where: { id: first.mediaId },
        select: { qualityProfileId: true },
      });
      const profile = media?.qualityProfileId
        ? await prisma.qualityProfile.findUnique({
            where: { id: media.qualityProfileId },
            include: qualityProfileFormatsInclude,
          })
        : null;

      // Re-score so a profile edited during the window is honoured; without a
      // profile the scorer is a no-op, so fall back to the score stored at pick time.
      const storedScore = new Map(
        rows.map((r) => [asRelease(r.release).guid, r.score]),
      );
      const ordered = scoreReleasesForProfile(
        rows.map((r) => asRelease(r.release)),
        profile ? profileToScoreInput(profile) : null,
      )
        .map((s) => ({
          ...s,
          score: profile ? s.score : (storedScore.get(s.release.guid) ?? 0),
        }))
        .sort((a, b) => b.score - a.score);

      for (const candidate of ordered) {
        const result = await grabRelease({
          mediaId: first.mediaId,
          episodeId: first.episodeId ?? undefined,
          season: first.season,
          downloadUrl: candidate.downloadUrl,
          releaseTitle: candidate.release.title,
          indexer: candidate.release.indexer,
        });
        if (result.grabbed) {
          grabbed++;
          break;
        }
        // Another grab already owns the target; later candidates would hit the same wall.
        if (result.reason.startsWith("A download is already active")) break;
      }

      await prisma.pendingRelease.deleteMany({ where: { targetKey } });
    } catch (e) {
      console.warn(`[processPendingReleases] ${targetKey} failed:`, e);
    }
  }

  if (grabbed > 0 || dropped > 0) {
    console.log(
      `[processPendingReleases] grabbed ${grabbed}, dropped ${dropped} target(s)`,
    );
  }
  return { grabbed, dropped };
}
