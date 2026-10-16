import { prisma } from "@rawkoon/api/db";
import type { AddToLibraryResponse } from "@rawkoon/shared/types";
import {
  APP_DISPLAY_TIMEZONE,
  localDateYmd,
  toUtcMidnightDate,
} from "@rawkoon/shared/utils/date";

type SearchOnAddOutcome = Pick<
  AddToLibraryResponse,
  "search_queued" | "search_skipped_reason" | "digital_release_date"
>;

/** digitalReleaseDate is a calendar day in the display timezone, so "today" is too. */
export function isMovieReleased(digital: Date | null): boolean {
  if (!digital) return false;
  return digital <= toUtcMidnightDate(localDateYmd(APP_DISPLAY_TIMEZONE));
}

/** Same 60-minute indexer grace the scheduled episode check uses. */
export function airedEpisodeCutoff(): Date {
  return toUtcMidnightDate(
    localDateYmd(APP_DISPLAY_TIMEZONE, new Date(Date.now() - 60 * 60 * 1000)),
  );
}

/** BullMQ job ids must not contain ":". A show gets one job per season. */
export const searchOnAddJobId = (mediaId: number, season?: number) =>
  season == null
    ? `search-on-add-${mediaId}`
    : `search-on-add-${mediaId}-s${season}`;

/** Seasons (specials excluded) with at least one aired, wanted episode that has no file. */
async function airedWantedSeasons(mediaId: number): Promise<number[]> {
  const rows = await prisma.libraryEpisode.findMany({
    where: {
      mediaId,
      monitored: true,
      status: "wanted",
      season: { gt: 0 },
      airDate: { lte: airedEpisodeCutoff() },
      files: { none: {} },
    },
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "asc" },
  });
  return rows.map((r) => r.season);
}

async function enqueueSearch(mediaId: number, season?: number): Promise<void> {
  // Loaded lazily so importing this module doesn't open the queue connections.
  const { QUEUE_NAMES, SCHEDULED_JOB_NAMES, addJob } = await import(
    "@rawkoon/api/services/queueService"
  );
  await addJob(
    QUEUE_NAMES.SCHEDULED_TASKS,
    SCHEDULED_JOB_NAMES.SEARCH_ON_ADD,
    season == null ? { mediaId } : { mediaId, season },
    // One pending search per title; finished jobs go away so a later re-add can search again.
    {
      jobId: searchOnAddJobId(mediaId, season),
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
}

async function searchOnAddEnabled(): Promise<boolean> {
  const row = await prisma.mediaSettings.findUnique({
    where: { id: 1 },
    select: { searchOnAdd: true },
  });
  return row?.searchOnAdd ?? true;
}

/**
 * Decide whether a freshly added title is searched right away and, if so,
 * queue the search. Never throws: a queue failure leaves the add intact and
 * the scheduled check picks the title up later.
 */
export async function queueSearchOnAdd(
  media: {
    id: number;
    type: string;
    status: string;
    monitored: boolean;
    digitalReleaseDate: Date | null;
  },
  override?: boolean,
  deps: {
    enqueue: (mediaId: number, season?: number) => Promise<unknown>;
    isEnabled: () => Promise<boolean>;
    airedSeasons: (mediaId: number) => Promise<number[]>;
  } = {
    enqueue: enqueueSearch,
    isEnabled: searchOnAddEnabled,
    airedSeasons: airedWantedSeasons,
  },
): Promise<SearchOnAddOutcome> {
  if (override === false) {
    return { search_queued: false, search_skipped_reason: "override_off" };
  }
  try {
    if (override === undefined && !(await deps.isEnabled())) {
      return { search_queued: false, search_skipped_reason: "setting_off" };
    }

    // The scheduled checks skip unmonitored titles, so an add must too.
    if (!media.monitored) {
      return { search_queued: false, search_skipped_reason: "not_monitored" };
    }

    if (media.type === "movie") {
      // Re-adding a title that already has files or is mid-download has nothing to look for.
      if (media.status !== "wanted") {
        return { search_queued: false, search_skipped_reason: null };
      }
      if (!isMovieReleased(media.digitalReleaseDate)) {
        return {
          search_queued: false,
          search_skipped_reason: "not_released",
          digital_release_date:
            media.digitalReleaseDate?.toISOString().slice(0, 10) ?? null,
        };
      }
    }

    if (media.type === "movie") {
      await deps.enqueue(media.id);
      return { search_queued: true, search_skipped_reason: null };
    }

    // One job per season keeps a long show from holding a worker slot for every season.
    const seasons = await deps.airedSeasons(media.id);
    for (const season of seasons) await deps.enqueue(media.id, season);
    return seasons.length > 0
      ? { search_queued: true, search_skipped_reason: null }
      : { search_queued: false, search_skipped_reason: null };
  } catch (e) {
    console.warn(`[searchOnAdd] Could not queue media ${media.id}:`, e);
    return { search_queued: false, search_skipped_reason: null };
  }
}
