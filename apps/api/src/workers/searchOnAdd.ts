import { prisma } from "@rawkoon/api/db";
import { searchAndGrabWithTitleFallback } from "@rawkoon/api/services/mediaGrabberSearch";
import { resolveSearchTitles } from "@rawkoon/api/utils/medias/resolveSearchTitles";
import { refreshLibraryMovieDigitalDate } from "@rawkoon/api/services/libraryTmdbRefresh";
import {
  airedEpisodeCutoff,
  isMovieReleased,
} from "@rawkoon/api/services/searchOnAdd";
import { SPACE_REFUSAL_PREFIX } from "@rawkoon/api/services/grabSpaceCheck";

type SearchTarget = {
  id: number;
  title: string;
  searchTitle: string | null;
  originalTitle: string | null;
  year: number | null;
  qualityProfileId: number | null;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Looks for a release right after a title is added. Same scoring/grab path as
 * the scheduled checks, but a miss is not recorded: the scheduled checks keep
 * their own attempt budget and pick the title up later.
 */
/** `season` set = one season of a show (the add queues one job per season). */
export async function searchOnAdd(
  mediaId: number,
  season?: number,
): Promise<void> {
  const media = await prisma.libraryMedia.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      type: true,
      status: true,
      monitored: true,
      title: true,
      searchTitle: true,
      originalTitle: true,
      year: true,
      qualityProfileId: true,
      digitalReleaseDate: true,
      _count: { select: { files: true } },
    },
  });
  // The scheduled checks skip unmonitored titles, so this does too.
  if (!media || !media.monitored) return;

  if (media.type === "movie") {
    if (media.status !== "wanted" || media._count.files > 0) return;
    await searchMovie(media, media.digitalReleaseDate);
  } else {
    await searchShow(media, season);
  }
}

async function searchMovie(
  media: SearchTarget,
  cachedDigital: Date | null,
): Promise<void> {
  let digital = cachedDigital;
  // TMDB dates are mutable, so a missing or due date is re-validated like the scheduled check does.
  if (!isMovieReleased(digital)) {
    try {
      digital = await refreshLibraryMovieDigitalDate(media.id);
    } catch (e) {
      console.warn(`[searchOnAdd] TMDB refresh failed for ${media.id}:`, e);
      return;
    }
  }
  if (!isMovieReleased(digital)) return;

  const { queries } = resolveSearchTitles(media);
  await searchAndGrabWithTitleFallback({
    trigger: "scheduled",
    mediaId: media.id,
    mediaType: "movie",
    titleBaseQueries: queries,
    suffix: media.year ? ` ${media.year}` : "",
    qualityProfileId: media.qualityProfileId,
  });
}

async function searchShow(
  media: SearchTarget,
  onlySeason?: number,
): Promise<void> {
  const cutoff = airedEpisodeCutoff();
  const episodes = await prisma.libraryEpisode.findMany({
    where: {
      mediaId: media.id,
      monitored: true,
      season: onlySeason ?? { gt: 0 },
    },
    select: {
      id: true,
      season: true,
      episode: true,
      status: true,
      airDate: true,
      _count: { select: { files: true } },
    },
    orderBy: [{ season: "asc" }, { episode: "asc" }],
  });

  const seasons = new Map<number, typeof episodes>();
  for (const ep of episodes) {
    const list = seasons.get(ep.season) ?? [];
    list.push(ep);
    seasons.set(ep.season, list);
  }

  const { queries } = resolveSearchTitles(media);
  for (const [season, all] of seasons) {
    const wanted = all.filter(
      (ep) =>
        ep.status === "wanted" &&
        ep._count.files === 0 &&
        ep.airDate != null &&
        ep.airDate <= cutoff,
    );
    if (wanted.length === 0) continue;

    // A fully aired, untouched season is looked for as a pack first.
    if (wanted.length === all.length) {
      try {
        const pack = await searchAndGrabWithTitleFallback({
          trigger: "scheduled",
          mediaId: media.id,
          season,
          mediaType: "tv",
          titleBaseQueries: queries,
          suffix: ` S${pad2(season)}`,
          qualityProfileId: media.qualityProfileId,
        });
        // A held grab or a full disk won't improve by searching episode by episode.
        if (
          pack.grabbed ||
          pack.delayed ||
          pack.reason.startsWith(SPACE_REFUSAL_PREFIX)
        ) {
          continue;
        }
      } catch (e) {
        console.warn(
          `[searchOnAdd] Season pack failed for ${media.id} S${season}:`,
          e,
        );
      }
    }

    for (const ep of wanted) {
      try {
        const result = await searchAndGrabWithTitleFallback({
          trigger: "scheduled",
          mediaId: media.id,
          episodeId: ep.id,
          mediaType: "tv",
          titleBaseQueries: queries,
          suffix: ` S${pad2(ep.season)}E${pad2(ep.episode)}`,
          qualityProfileId: media.qualityProfileId,
        });
        if (!result.grabbed && result.reason.startsWith(SPACE_REFUSAL_PREFIX)) {
          return;
        }
      } catch (e) {
        console.warn(`[searchOnAdd] Episode ${ep.id} failed:`, e);
      }
    }
  }
}
