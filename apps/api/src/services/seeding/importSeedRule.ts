import { prisma } from "@rawkoon/api/db";
import type { DownloadClientType } from "@rawkoon/api/services/downloadClient/types";
import { loadSeedContext } from "@rawkoon/api/services/seeding/seedSweep";
import {
  resolveIndexerRule,
  withoutZeroTargets,
  type Rule,
} from "@rawkoon/api/services/seeding/seedPolicy";

/**
 * The seed targets a torrent must meet before an import removes it: one per
 * row that shares the torrent, as the seed sweep requires. Empty when the
 * import-time decision ignores them. Null when they can't be loaded, so the
 * files already placed by the import aren't failed over a lookup.
 */
export async function loadImportSeedRules(input: {
  hash: string;
  indexer: string | null;
  type: DownloadClientType;
  seedSweepEnabled: boolean;
}): Promise<Rule[] | null> {
  if (input.type === "rdtclient" || input.seedSweepEnabled) return [];
  try {
    const [ctx, rows] = await Promise.all([
      loadSeedContext(),
      prisma.downloadHistory.findMany({
        where: {
          torrentHash: { equals: input.hash, mode: "insensitive" },
          failed: false,
          seedReleasedAt: null,
        },
        select: { indexer: true },
      }),
    ]);
    const indexers = new Set([input.indexer, ...rows.map((r) => r.indexer)]);
    return [...indexers].flatMap((indexer) =>
      // An unknown indexer could be public or private, so it must meet both.
      indexer == null
        ? [
            withoutZeroTargets(ctx.defaults.publicRule),
            withoutZeroTargets(ctx.defaults.privateRule),
          ]
        : [resolveIndexerRule(indexer, ctx).rule],
    );
  } catch (error) {
    console.warn(
      "[postProcess] Could not load the seed targets, keeping the torrent:",
      error,
    );
    return null;
  }
}
