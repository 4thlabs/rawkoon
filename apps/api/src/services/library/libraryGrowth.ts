import { loadConfig } from "@rawkoon/api/config";
import { prisma } from "@rawkoon/api/db";
import { getJsonCache, setJsonCache } from "@rawkoon/api/services/cache";
import { calendarDateInTz } from "@rawkoon/api/services/books/listeningStatsMath";
import {
  bucketGrowthRows,
  earliestWindowMs,
  growthWindows,
  type GrowthCounts,
  type GrowthKind,
  type GrowthRow,
} from "@rawkoon/api/services/library/libraryGrowthMath";
import type { LibraryGrowth, LibraryGrowthBucket } from "@rawkoon/shared/types";

const CACHE_TTL_SECONDS = 600;
const DAY_MS = 86_400_000;

type RawRow = { t: Date; bytes: bigint; kind: GrowthKind };

/**
 * One row per landed item since `lower`. Episodes and movies are counted once
 * with all their files' bytes; books carry their edition files' bytes.
 * ::bigint casts keep SUM from coming back as a Decimal.
 */
function queryLanded(lower: Date): Promise<RawRow[]> {
  return prisma.$queryRaw<RawRow[]>`
    SELECT e.downloaded_at AS t, SUM(f.size_bytes)::bigint AS bytes, 'episode' AS kind
      FROM library_episodes e
      JOIN media_files f ON f.episode_id = e.id
     WHERE e.downloaded_at >= ${lower}
     GROUP BY e.id
    UNION ALL
    SELECT d.done AS t, SUM(f.size_bytes)::bigint AS bytes, 'movie' AS kind
      FROM library_media m
      JOIN media_files f ON f.media_id = m.id AND f.episode_id IS NULL
      JOIN (
        SELECT media_id, MAX(completed_at) AS done
          FROM download_history
         WHERE NOT failed AND completed_at IS NOT NULL
           AND episode_id IS NULL AND book_edition_id IS NULL
         GROUP BY media_id
      ) d ON d.media_id = m.id
     WHERE m.type = 'movie' AND d.done >= ${lower}
     GROUP BY m.id, d.done
    UNION ALL
    SELECT h.completed_at AS t,
           COALESCE((SELECT SUM(bf.size_bytes) FROM book_files bf
                      WHERE bf.edition_id = h.book_edition_id), 0)::bigint AS bytes,
           'book' AS kind
      FROM download_history h
     WHERE NOT h.failed AND h.completed_at >= ${lower}
       AND h.book_edition_id IS NOT NULL
    UNION ALL
    SELECT h.completed_at AS t, 0::bigint AS bytes, 'upgrade' AS kind
      FROM download_history h
     WHERE NOT h.failed AND h.completed_at >= ${lower} AND h.is_upgrade
  `;
}

/** Earliest landing of any kind, over all history. */
async function queryFirstLanding(): Promise<Date | null> {
  const rows = await prisma.$queryRaw<{ first: Date | null }[]>`
    SELECT LEAST(
      (SELECT MIN(e.downloaded_at) FROM library_episodes e
        WHERE EXISTS (SELECT 1 FROM media_files f WHERE f.episode_id = e.id)),
      (SELECT MIN(d.done) FROM library_media m
         JOIN (
           SELECT media_id, MAX(completed_at) AS done FROM download_history
            WHERE NOT failed AND completed_at IS NOT NULL
              AND episode_id IS NULL AND book_edition_id IS NULL
            GROUP BY media_id
         ) d ON d.media_id = m.id
        WHERE m.type = 'movie'
          AND EXISTS (SELECT 1 FROM media_files f
                       WHERE f.media_id = m.id AND f.episode_id IS NULL)),
      (SELECT MIN(completed_at) FROM download_history
        WHERE NOT failed AND completed_at IS NOT NULL
          AND (book_edition_id IS NOT NULL OR is_upgrade))
    ) AS first
  `;
  return rows[0]?.first ?? null;
}

const toBucket = (
  c: GrowthCounts,
  includeBytes: boolean,
): LibraryGrowthBucket => ({
  start: c.start,
  movies: c.movies,
  episodes: c.episodes,
  books: c.books,
  upgrades: c.upgrades,
  bytes: includeBytes ? c.bytes : null,
});

/** Computes growth for `now`; `bytes` is null unless `includeBytes`. */
export async function computeLibraryGrowth(
  includeBytes: boolean,
  now = new Date(),
): Promise<LibraryGrowth> {
  const timezone = loadConfig().TZ;
  const windows = growthWindows(now, timezone);
  // A day of slack covers any UTC offset between the wall and instant scales.
  const lower = new Date(earliestWindowMs(windows) - DAY_MS);

  const [raw, first] = await Promise.all([
    queryLanded(lower),
    queryFirstLanding(),
  ]);
  const rows: GrowthRow[] = raw.map((r) => ({
    t: new Date(r.t),
    bytes: Number(r.bytes),
    kind: r.kind,
  }));
  const b = bucketGrowthRows(rows, windows);

  return {
    timezone,
    month: toBucket(b.month, includeBytes),
    previous_to_date: toBucket(b.previous_to_date, includeBytes),
    previous_month: toBucket(b.previous_month, includeBytes),
    weeks: b.weeks.map((w) => toBucket(w, includeBytes)),
    since: first ? calendarDateInTz(first, timezone) : null,
  };
}

/** Cached for 10 minutes, keyed by admin vs member since bytes differ. */
export async function getLibraryGrowth(
  isAdmin: boolean,
): Promise<LibraryGrowth> {
  const key = `library:growth:${isAdmin ? "admin" : "member"}`;
  const cached = await getJsonCache<LibraryGrowth>(key);
  if (cached) return cached;
  const growth = await computeLibraryGrowth(isAdmin);
  await setJsonCache(key, growth, CACHE_TTL_SECONDS);
  return growth;
}
