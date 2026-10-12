import type { DownloadClientType } from "@rawkoon/api/services/downloadClient/types";
import { loadSeedContext } from "@rawkoon/api/services/seeding/seedSweep";
import {
  resolveIndexerRule,
  type Rule,
} from "@rawkoon/api/services/seeding/seedPolicy";

const NO_TARGET: Rule = { ratio: null, seedTimeMins: null };

/**
 * The target the seed sweep would use for this indexer; skipped when the
 * import-time decision ignores it. Null when it can't be loaded, so the files
 * already placed by the import aren't failed over a lookup.
 */
export async function loadImportSeedRule(input: {
  indexer: string | null;
  type: DownloadClientType;
  seedSweepEnabled: boolean;
}): Promise<Rule | null> {
  if (input.type === "rdtclient" || input.seedSweepEnabled) return NO_TARGET;
  try {
    return resolveIndexerRule(input.indexer, await loadSeedContext()).rule;
  } catch (error) {
    console.warn(
      "[postProcess] Could not load the seed target, keeping the torrent:",
      error,
    );
    return null;
  }
}
