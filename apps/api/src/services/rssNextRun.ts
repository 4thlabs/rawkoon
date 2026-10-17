import {
  scheduledTasksQueue,
  SCHEDULED_JOB_NAMES,
} from "@rawkoon/api/services/queueService";

/** The scheduler's next poll, or the next quarter-hour boundary when it has none queued. */
export async function getNextRssRunAt(): Promise<string> {
  const repeatableJobs = await scheduledTasksQueue.getJobSchedulers();
  const rssJob = repeatableJobs.find(
    (j) => j.name === SCHEDULED_JOB_NAMES.POLL_INDEXER_RSS,
  );
  const bullNext = rssJob?.next ? new Date(rssJob.next) : null;
  const now = new Date();
  if (bullNext && bullNext > now) return bullNext.toISOString();
  const nextMins = Math.ceil((now.getUTCMinutes() + 1) / 15) * 15;
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours() + Math.floor(nextMins / 60),
      nextMins % 60,
      0,
      0,
    ),
  ).toISOString();
}
