import type { Queue } from "bullmq";
import { DEFAULT_RELEASE_CHECK_CRON, isValidCron } from "@rawkoon/shared/utils";
import { prisma } from "@rawkoon/api/db";
import type { SCHEDULED_JOB_NAMES } from "@rawkoon/api/services/queueService";
import { scheduledTasksQueue } from "@rawkoon/api/services/queueService";

// Literals, not SCHEDULED_JOB_NAMES: test preload replaces that module's constants.
export const RELEASE_CHECK_JOB_NAMES = [
  "check-library-movie-releases",
  "check-library-episode-releases",
] as const satisfies ReadonlyArray<
  (typeof SCHEDULED_JOB_NAMES)[keyof typeof SCHEDULED_JOB_NAMES]
>;

type SchedulerQueue = Pick<Queue, "removeJobScheduler" | "upsertJobScheduler">;

/** The stored cron, or the default when the row is missing or holds something unusable. */
export async function loadReleaseCheckCron(): Promise<string> {
  try {
    const row = await prisma.mediaSettings.findUnique({
      where: { id: 1 },
      select: { releaseCheckCron: true },
    });
    const cron = row?.releaseCheckCron?.trim();
    return cron && isValidCron(cron) ? cron : DEFAULT_RELEASE_CHECK_CRON;
  } catch {
    return DEFAULT_RELEASE_CHECK_CRON;
  }
}

/** Replaces the movie and episode release-check schedulers in place, no restart needed. */
export async function applyReleaseCheckSchedule(
  cron: string,
  queue: SchedulerQueue = scheduledTasksQueue,
): Promise<void> {
  for (const name of RELEASE_CHECK_JOB_NAMES) {
    // Removing first also drops the already-queued next run at the old time.
    await queue.removeJobScheduler(name);
    await queue.upsertJobScheduler(name, { pattern: cron }, { name, data: {} });
  }
}
