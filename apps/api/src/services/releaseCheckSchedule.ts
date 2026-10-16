import type { Queue } from "bullmq";
import { CronExpressionParser } from "cron-parser";
import {
  DEFAULT_RELEASE_CHECK_CRON,
  MIN_RELEASE_CHECK_INTERVAL_MINUTES,
  validateReleaseCheckCron,
} from "@rawkoon/shared/utils";
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

type SchedulerQueue = Pick<Queue, "upsertJobScheduler">;

export type ParsedReleaseCheckCron =
  | { ok: true; cron: string }
  | { ok: false; error: string };

/** Validates with the shared rules, then with the same parser BullMQ schedules with. */
export function parseReleaseCheckCron(raw: string): ParsedReleaseCheckCron {
  const result = validateReleaseCheckCron(raw);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "tooFrequent"
          ? `release_check_cron must run at most every ${MIN_RELEASE_CHECK_INTERVAL_MINUTES} minutes`
          : "release_check_cron must be a 5-field cron expression that can fire",
    };
  }
  try {
    CronExpressionParser.parse(result.cron).next();
  } catch {
    return { ok: false, error: "release_check_cron could not be scheduled" };
  }
  return { ok: true, cron: result.cron };
}

async function readStoredCron(): Promise<string | undefined> {
  const row = await prisma.mediaSettings.findUnique({
    where: { id: 1 },
    select: { releaseCheckCron: true },
  });
  return row?.releaseCheckCron;
}

/** The stored cron, or the default when the row is missing or holds something unusable. */
export async function loadReleaseCheckCron(
  read: () => Promise<string | null | undefined> = readStoredCron,
): Promise<string> {
  let stored: string | null | undefined;
  try {
    stored = await read();
  } catch {
    return DEFAULT_RELEASE_CHECK_CRON;
  }
  if (stored === undefined || stored === null) {
    return DEFAULT_RELEASE_CHECK_CRON;
  }
  const parsed = parseReleaseCheckCron(stored);
  if (parsed.ok) return parsed.cron;
  console.warn(
    `Stored release check schedule is unusable (${parsed.error}); using the default`,
  );
  return DEFAULT_RELEASE_CHECK_CRON;
}

/** Points the movie and episode release-check schedulers at `cron`; upsert replaces in place. */
export async function applyReleaseCheckSchedule(
  cron: string,
  queue: SchedulerQueue = scheduledTasksQueue,
): Promise<void> {
  for (const name of RELEASE_CHECK_JOB_NAMES) {
    await queue.upsertJobScheduler(name, { pattern: cron }, { name, data: {} });
  }
}

/** Registers each scheduler on its own so one bad pattern can't stop the rest. */
export async function registerSchedulers(
  jobs: ReadonlyArray<{ name: string; pattern: string }>,
  queue: SchedulerQueue = scheduledTasksQueue,
): Promise<void> {
  for (const job of jobs) {
    try {
      await queue.upsertJobScheduler(
        job.name,
        { pattern: job.pattern },
        { name: job.name, data: {} },
      );
      console.log(`   - Scheduled ${job.name} with pattern ${job.pattern}`);
    } catch (err) {
      console.error(
        `   - Failed to schedule ${job.name} (${job.pattern}):`,
        err,
      );
    }
  }
}

/**
 * Schedules first, then persists. If either step fails the schedulers are put
 * back on `previous` and the error is rethrown, so the stored value and the
 * live schedule never disagree.
 */
export async function rescheduleThenPersist(
  cron: string,
  previous: string,
  persist: () => Promise<void>,
  queue: SchedulerQueue = scheduledTasksQueue,
): Promise<void> {
  try {
    await applyReleaseCheckSchedule(cron, queue);
    await persist();
  } catch (err) {
    await applyReleaseCheckSchedule(previous, queue).catch(() => {});
    throw err;
  }
}
