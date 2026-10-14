import type {
  DashboardHeroItem,
  DashboardHeroResponse,
  DiscoverDeckResponse,
} from "@rawkoon/shared/types";

export const HERO_MAX_ITEMS = 5;
export const HERO_ARRIVAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** Candidates examined before giving up on finding enough backdrops. */
const HERO_CANDIDATE_POOL = 15;

export interface HeroArrivalCandidate {
  libraryId: number;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string | null;
  posterUrl: string | null;
  year: number | null;
  /** The library override backdrop, when one is set. */
  overrideBackdropUrl: string | null;
  arrivedAt: Date;
  seasonNumber: number | null;
  episodeNumber: number | null;
}

export interface HomeHeroDeps {
  /** Latest successful import per media in the window, newest first. */
  loadArrivals(since: Date, limit: number): Promise<HeroArrivalCandidate[]>;
  /** The TMDB backdrop for a title, or null when TMDB has none or is off. */
  loadTmdbBackdrop(
    mediaType: "movie" | "tv",
    tmdbId: number,
  ): Promise<string | null>;
  /** The personalized-or-trending deck; null when TMDB is not configured. */
  loadDeck(limit: number): Promise<DiscoverDeckResponse | null>;
}

async function buildArrivalItems(
  deps: HomeHeroDeps,
  now: Date,
): Promise<DashboardHeroItem[]> {
  const since = new Date(now.getTime() - HERO_ARRIVAL_WINDOW_MS);
  const candidates = await deps.loadArrivals(since, HERO_CANDIDATE_POOL);

  const resolved = await Promise.all(
    candidates.map(async (c): Promise<DashboardHeroItem | null> => {
      const backdrop =
        c.overrideBackdropUrl ??
        (await deps.loadTmdbBackdrop(c.mediaType, c.tmdbId).catch(() => null));
      if (!backdrop) return null;
      return {
        library_id: c.libraryId,
        tmdb_id: c.tmdbId,
        media_type: c.mediaType,
        title: c.title,
        overview: c.overview,
        backdrop_url: backdrop,
        poster_url: c.posterUrl,
        arrived_at: c.arrivedAt.toISOString(),
        season_number: c.seasonNumber,
        episode_number: c.episodeNumber,
        year: c.year,
      };
    }),
  );
  return resolved
    .filter((i): i is DashboardHeroItem => i !== null)
    .slice(0, HERO_MAX_ITEMS);
}

function buildDeckItems(deck: DiscoverDeckResponse): DashboardHeroItem[] {
  const items: DashboardHeroItem[] = [];
  for (const d of deck.items) {
    if (!d.backdrop_url) continue;
    items.push({
      library_id: null,
      tmdb_id: d.tmdb_id,
      media_type: d.media_type,
      title: d.title,
      overview: d.overview,
      backdrop_url: d.backdrop_url,
      poster_url: d.poster_url,
      arrived_at: null,
      season_number: null,
      episode_number: null,
      year: d.release_year,
    });
    if (items.length === HERO_MAX_ITEMS) break;
  }
  return items;
}

/** Recent arrivals when there are any, else the discover deck. */
export async function buildHomeHero(
  deps: HomeHeroDeps,
  now: Date = new Date(),
): Promise<DashboardHeroResponse> {
  const arrivals = await buildArrivalItems(deps, now);
  if (arrivals.length > 0) return { source: "arrivals", items: arrivals };

  const deck = await deps.loadDeck(HERO_CANDIDATE_POOL * 2);
  if (!deck) return { source: "trending", items: [] };
  const items = buildDeckItems(deck);
  return {
    source: deck.source === "personalized" ? "for_you" : "trending",
    items,
  };
}
