import { prisma } from "@rawkoon/api/db";
import { hasActiveShowGrab } from "@rawkoon/api/services/activeShowGrab";
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

/** "series" = the one job that looks for a complete-series pack before any season. */
export type SearchScope = number | "series";

/** BullMQ job ids must not contain ":". A show gets one job per season, plus one for the whole series. */
export const searchOnAddJobId = (mediaId: number, scope?: SearchScope) =>
  scope == null
    ? `search-on-add-${mediaId}`
    : scope === "series"
      ? `search-on-add-${mediaId}-series`
      : `search-on-add-${mediaId}-s${scope}`;

/**
 * The seasons a complete-series pack would have to cover, or null when the
 * show isn't a clean slate: every season with an aired episode must be fully
 * aired, wanted and file-less, and a second season is what makes a pack
 * worth looking for. Seasons with nothing aired yet are ignored.
 */
export async function completeSeriesSeasons(
  mediaId: number,
): Promise<number[] | null> {
  if (await hasActiveShowGrab(mediaId)) return null;
  const cutoff = airedEpisodeCutoff();
  const episodes = await prisma.libraryEpisode.findMany({
    where: { mediaId, monitored: true, season: { gt: 0 } },
    select: {
      season: true,
      status: true,
      airDate: true,
      _count: { select: { files: true } },
    },
  });
  const bySeason = new Map<number, typeof episodes>();
  for (const ep of episodes) {
    bySeason.set(ep.season, [...(bySeason.get(ep.season) ?? []), ep]);
  }
  const seasons: number[] = [];
  for (const [season, list] of bySeason) {
    const aired = list.filter((e) => e.airDate != null && e.airDate <= cutoff);
    if (aired.length === 0) continue;
    const untouched = list.every(
      (e) => e.status === "wanted" && e._count.files === 0,
    );
    if (aired.length !== list.length || !untouched) return null;
    seasons.push(season);
  }
  return seasons.length >= 2 ? seasons.sort((a, b) => a - b) : null;
}

/** Seasons (specials excluded) with at least one aired, wanted episode that has no file. */
async function airedWantedSeasons(mediaId: number): Promise<number[]> {
  // A complete-series pack in flight already covers every season.
  if (await hasActiveShowGrab(mediaId)) return [];
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

async function enqueueSearch(
  mediaId: number,
  scope?: SearchScope,
): Promise<void> {
  // Loaded lazily so importing this module doesn't open the queue connections.
  const { QUEUE_NAMES, SCHEDULED_JOB_NAMES, addJob } = await import(
    "@rawkoon/api/services/queueService"
  );
  await addJob(
    QUEUE_NAMES.SCHEDULED_TASKS,
    SCHEDULED_JOB_NAMES.SEARCH_ON_ADD,
    scope == null
      ? { mediaId }
      : scope === "series"
        ? { mediaId, series: true }
        : { mediaId, season: scope },
    // One pending search per title; finished jobs go away so a later re-add can search again.
    {
      jobId: searchOnAddJobId(mediaId, scope),
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
    enqueue: (mediaId: number, scope?: SearchScope) => Promise<unknown>;
    isEnabled: () => Promise<boolean>;
    airedSeasons: (mediaId: number) => Promise<number[]>;
    completeSeries: (mediaId: number) => Promise<number[] | null>;
  } = {
    enqueue: enqueueSearch,
    isEnabled: searchOnAddEnabled,
    airedSeasons: airedWantedSeasons,
    completeSeries: completeSeriesSeasons,
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

    // A clean-slate show looks for one complete-series pack first; that job queues the seasons on a miss.
    if (await deps.completeSeries(media.id)) {
      await deps.enqueue(media.id, "series");
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

/** Queue the per-season searches; what the series job does when it finds no pack. */
export async function enqueueSeasonSearches(mediaId: number): Promise<void> {
  for (const season of await airedWantedSeasons(mediaId)) {
    await enqueueSearch(mediaId, season);
  }
}
