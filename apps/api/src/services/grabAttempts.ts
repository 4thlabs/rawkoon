import { prisma } from "@rawkoon/api/db";
import { MAX_CRON_GRAB_ATTEMPTS } from "@rawkoon/api/constants/libraryGrab";
import { notifyAdminsLibraryGrabSkipped } from "@rawkoon/api/workers/notifyLibraryGrabSkipped";

const capReason = (reason: string) =>
  `No matching release after ${MAX_CRON_GRAB_ATTEMPTS} attempts (${reason})`;

/** Count a failed automatic grab against a movie; skip and notify at the cap. */
export async function recordMovieMiss(
  m: { id: number; searchAttempts: number },
  reason: string,
): Promise<void> {
  const next = m.searchAttempts + 1;
  const reachedCap = next >= MAX_CRON_GRAB_ATTEMPTS;
  await prisma.libraryMedia.update({
    where: { id: m.id },
    data: {
      searchAttempts: next,
      ...(reachedCap ? { status: "skipped" } : {}),
    },
  });
  if (reachedCap) {
    await notifyAdminsLibraryGrabSkipped({
      mediaId: m.id,
      reason: capReason(reason),
      scope: "movie",
    });
  }
}

/** Count a failed automatic grab against an episode; skip and notify at the cap. */
export async function recordEpisodeMiss(
  ep: { id: number; mediaId: number; searchAttempts: number },
  reason: string,
): Promise<void> {
  const next = ep.searchAttempts + 1;
  const reachedCap = next >= MAX_CRON_GRAB_ATTEMPTS;
  await prisma.libraryEpisode.update({
    where: { id: ep.id },
    data: {
      searchAttempts: next,
      ...(reachedCap ? { status: "skipped" } : {}),
    },
  });
  if (reachedCap) {
    await notifyAdminsLibraryGrabSkipped({
      mediaId: ep.mediaId,
      episodeId: ep.id,
      reason: capReason(reason),
      scope: "episode",
    });
  }
}

/** Count a failed season-pack grab against every episode in it; notify once if any hit the cap. */
export async function recordSeasonPackMiss(
  mediaId: number,
  season: number,
  episodes: { id: number; searchAttempts: number }[],
  reason: string,
): Promise<void> {
  let anySkipped = false;
  for (const ep of episodes) {
    const next = ep.searchAttempts + 1;
    const reachedCap = next >= MAX_CRON_GRAB_ATTEMPTS;
    await prisma.libraryEpisode.update({
      where: { id: ep.id },
      data: {
        searchAttempts: next,
        ...(reachedCap ? { status: "skipped" } : {}),
      },
    });
    if (reachedCap) anySkipped = true;
  }
  if (anySkipped) {
    await notifyAdminsLibraryGrabSkipped({
      mediaId,
      season,
      reason: capReason(reason),
      scope: "season_pack",
    });
  }
}
