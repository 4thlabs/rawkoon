import { describe, expect, it } from "bun:test";
import { applyAfterImportAction } from "./afterImport";
import type { DownloadClientAdapter, NormalizedTorrent } from "./types";

const H1 = "11".repeat(20);
const H2 = "22".repeat(20);

function torrent(hash: string, contentPath: string): NormalizedTorrent {
  return {
    hash,
    name: hash,
    state: "completed",
    progress: 1,
    savePath: "/dl",
    contentPath,
    seeds: 0,
    peers: 0,
    dlSpeed: 0,
    upSpeed: 0,
    seedingTimeSecs: null,
    category: null,
    sizeBytes: 1,
    labels: [],
    ratio: null,
  };
}

function adapter(
  list: NormalizedTorrent[],
  removed: Array<[string, boolean]>,
): DownloadClientAdapter {
  return {
    type: "rdtclient",
    testConnection: async () => ({ ok: true }),
    addTorrent: async () => ({ hash: null }),
    listTorrents: async () => list,
    getTorrent: async () => null,
    listFiles: async () => null,
    pause: async () => {},
    resume: async () => {},
    remove: async (hash, deleteData) => {
      removed.push([hash, deleteData]);
    },
  };
}

describe("applyAfterImportAction", () => {
  it("removes the torrent with its data when nothing else shares it", async () => {
    const removed: Array<[string, boolean]> = [];
    await applyAfterImportAction(
      adapter([torrent(H1, "/dl/a"), torrent(H2, "/dl/b")], removed),
      H1,
      "removeWithData",
      "test",
    );
    expect(removed).toEqual([[H1, true]]);
  });

  it("keeps the data when another torrent shares the content path", async () => {
    const removed: Array<[string, boolean]> = [];
    await applyAfterImportAction(
      adapter(
        [torrent(H1, "/dl/pack"), torrent(H2, "/dl/pack/ep1.mkv")],
        removed,
      ),
      H1,
      "removeWithData",
      "test",
    );
    expect(removed).toEqual([[H1, false]]);
  });

  it("keeps the data when the torrent is no longer listed", async () => {
    const removed: Array<[string, boolean]> = [];
    await applyAfterImportAction(
      adapter([], removed),
      H1,
      "removeWithData",
      "test",
    );
    expect(removed).toEqual([[H1, false]]);
  });

  it("does nothing for keep", async () => {
    const removed: Array<[string, boolean]> = [];
    await applyAfterImportAction(adapter([], removed), H1, "keep", "test");
    expect(removed).toEqual([]);
  });
});
