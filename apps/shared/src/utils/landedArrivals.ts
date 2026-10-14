import type { LandedArrival } from "../types/library";

// Mirrors RawkoonKit's LandedArrivals so web and iOS pin the same arrivals.

const LANDED_TTL_MS = 30 * 60 * 1000;
const LANDED_MAX = 10;

/** Newest first, one entry per media (the newer wins), expired ones dropped, capped. */
export function insertLanded(
  list: readonly LandedArrival[],
  arrival: LandedArrival,
  now: number,
): LandedArrival[] {
  return freshLanded(
    [arrival, ...list.filter((a) => a.mediaId !== arrival.mediaId)],
    now,
  ).slice(0, LANDED_MAX);
}

export function freshLanded(
  list: readonly LandedArrival[],
  now: number,
): LandedArrival[] {
  return list.filter((a) => now - a.ts < LANDED_TTL_MS);
}

/** "S01E04" for an episode, "S02" for a season pack, "" for a movie. */
export function landedEpisodeCode(
  season: number | null,
  episode: number | null,
): string {
  if (season == null) return "";
  const s = `S${String(season).padStart(2, "0")}`;
  return episode == null ? s : `${s}E${String(episode).padStart(2, "0")}`;
}
