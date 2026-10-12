import {
  isSeedTargetMet,
  sharesContentPath,
  type Rule,
} from "@rawkoon/api/services/seeding/seedPolicy";
import type { DownloadClientAdapter, DownloadClientType } from "./types";

export type AfterImportAction = "keep" | "remove" | "removeWithData";

/**
 * What a post-processor does with the torrent right after an import.
 * Debrid clients (rdt-client) never seed, so their local copy is dropped once
 * every file has been placed: the library holds its own hardlink or moved file.
 */
export function afterImportAction(input: {
  type: DownloadClientType;
  ratio: number | null;
  seedingTimeSecs: number | null;
  /** The seed target the sweep would apply to this torrent's indexer; null when unknown. */
  rule: Rule | null;
  seedSweepEnabled: boolean;
  /** Every file was placed by this import, so nothing still needs the source. */
  fullyImported: boolean;
}): AfterImportAction {
  if (input.type === "rdtclient") {
    // Keeping the entry lets a retry or manual import still find the files.
    return input.fullyImported ? "removeWithData" : "keep";
  }
  // Once the seed sweep is on it owns removal, with per-indexer targets.
  if (input.seedSweepEnabled || input.rule == null) return "keep";
  return isSeedTargetMet(
    {
      ratio: input.ratio,
      seedingTimeSecs: input.seedingTimeSecs,
      upSpeed: 0,
      sizeBytes: 0,
    },
    input.rule,
  )
    ? "remove"
    : "keep";
}

/** Apply an after-import action; data is kept when another torrent shares it. */
export async function applyAfterImportAction(
  adapter: DownloadClientAdapter,
  hash: string,
  action: AfterImportAction,
  logTag: string,
): Promise<void> {
  if (action === "keep") return;
  try {
    let deleteData = action === "removeWithData";
    if (deleteData) {
      const torrents = await adapter.listTorrents();
      const self = torrents.find(
        (t) => t.hash.toLowerCase() === hash.toLowerCase(),
      );
      deleteData = self != null && !sharesContentPath(self, torrents);
    }
    await adapter.remove(hash, deleteData);
  } catch (error) {
    console.warn(`[${logTag}] Could not remove torrent ${hash}:`, error);
  }
}
