import { prisma } from "@rawkoon/api/db";
import {
  mapLibraryMedia,
  libraryMediaInclude,
} from "@rawkoon/api/routes/library/libraryHelpers";
import { loadEnabledTmdbConfig } from "@rawkoon/api/routes/medias/tmdb/tmdbRouteHelpers";
import { buildDiscoverDeck } from "@rawkoon/api/services/discover/buildDiscoverDeck";
import { TmdbProvider } from "@rawkoon/api/services/discover/tmdbProvider";
import { fetchMediaDetails } from "@rawkoon/api/utils/medias/tmdbFetcherDetails";
import { toTmdbLanguage } from "@rawkoon/api/utils/medias/tmdbFetcherCore";
import type { TitleLanguage } from "@rawkoon/shared/constants";
import type { HomeHeroDeps } from "./homeHero";

/** Rows scanned to find `limit` distinct media; one show can import many episodes. */
const ARRIVAL_SCAN_ROWS = 200;

export function createHomeHeroDeps(
  userId: string,
  titleLanguage: TitleLanguage,
): HomeHeroDeps {
  const tmdbLanguage = toTmdbLanguage(titleLanguage);
  let tmdbConfig: ReturnType<typeof loadEnabledTmdbConfig> | undefined;
  const loadTmdbConfig = () => (tmdbConfig ??= loadEnabledTmdbConfig());

  return {
    async loadArrivals(since, limit) {
      // Same success signature downloadOutcome writes: a destination path with
      // no error and no skip (a skipped import placed nothing new).
      const rows = await prisma.downloadHistory.findMany({
        where: {
          mediaId: { not: null },
          failed: false,
          // An upgrade replaces a file the user already had; it isn't an arrival.
          isUpgrade: false,
          completedAt: { gte: since },
          postProcessDestinationPath: { not: null },
          postProcessError: null,
          postProcessSkipReason: null,
        },
        orderBy: { completedAt: "desc" },
        take: ARRIVAL_SCAN_ROWS,
        select: {
          completedAt: true,
          season: true,
          episode: { select: { season: true, episode: true } },
          media: { include: libraryMediaInclude },
        },
      });

      const seen = new Set<number>();
      const out = [];
      for (const row of rows) {
        const media = row.media;
        if (!media || !row.completedAt || seen.has(media.id)) continue;
        seen.add(media.id);
        const mapped = mapLibraryMedia(media, titleLanguage);
        out.push({
          libraryId: media.id,
          tmdbId: media.tmdbId,
          mediaType:
            media.type === "movie" ? ("movie" as const) : ("tv" as const),
          title: mapped.title,
          overview: mapped.overview,
          posterUrl: mapped.poster_url,
          year: mapped.year,
          overrideBackdropUrl: mapped.backdrop_url,
          arrivedAt: row.completedAt,
          seasonNumber: row.episode?.season ?? row.season,
          episodeNumber: row.episode?.episode ?? null,
        });
        if (out.length === limit) break;
      }
      return out;
    },

    async loadTmdbBackdrop(mediaType, tmdbId) {
      const config = await loadTmdbConfig();
      if (!config) return null;
      const details = await fetchMediaDetails(
        config.api_key,
        mediaType,
        tmdbId,
        tmdbLanguage,
      );
      return details.primary_backdrop_url;
    },

    async loadDeck(limit) {
      const config = await loadTmdbConfig();
      if (!config) return null;
      return buildDiscoverDeck({
        provider: new TmdbProvider(config.api_key),
        userId,
        language: tmdbLanguage,
        excludeTmdbIds: [],
        limit,
      });
    },
  };
}
