import { beforeEach, describe, expect, it, mock } from "bun:test";

const remove = mock(async (_hash: string, _deleteData: boolean) => {});
const getTorrent = mock(async (_hash: string): Promise<unknown> => null);
const updateMany = mock(async (_arg: unknown) => ({ count: 1 }));
const mediaUpdateMany = mock(async (_arg: unknown) => ({ count: 1 }));
const revert = mock(async (_dh: unknown) => {});
type Row = {
  id: number;
  mediaId: number;
  episodeId: null;
  torrentHash: string | null;
  releaseTitle: string;
};
let rows: Row[] = [];
let sharedCount = 0;
let claimCount = 1;

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    downloadHistory: {
      findMany: async () => rows,
      count: async () => sharedCount,
      updateMany: async (arg: { data: { failed: boolean } }) =>
        arg.data.failed ? { count: claimCount } : updateMany(arg),
    },
    libraryMedia: { updateMany: mediaUpdateMany },
  },
}));
mock.module("@rawkoon/api/services/downloadClient/registry", () => ({
  resolveActiveAdapter: async () => ({ adapter: { remove, getTorrent } }),
}));
mock.module("@rawkoon/api/services/downloadOutcome", () => ({
  revertToWantedIfNoActiveGrabs: revert,
}));
mock.module("@rawkoon/api/services/libraryEvents", () => ({
  emitLibraryUpdate: () => {},
}));

const { cancelActiveMovieDownloads } = await import("./replaceActiveDownload");

const hash = "a".repeat(40);
const release = {
  releaseTitle: "New.Release.2160p",
  downloadUrl: `magnet:?xt=urn:btih:${"b".repeat(40)}`,
};

describe("cancelActiveMovieDownloads", () => {
  beforeEach(() => {
    remove.mockClear();
    updateMany.mockClear();
    revert.mockClear();
    getTorrent.mockClear();
    remove.mockImplementation(async () => {});
    getTorrent.mockImplementation(async () => null);
    sharedCount = 0;
    claimCount = 1;
    rows = [
      {
        id: 7,
        mediaId: 1,
        episodeId: null,
        torrentHash: hash,
        releaseTitle: "Old.Release.1080p",
      },
    ];
  });

  it("claims the row, removes the torrent with its data and reverts the item", async () => {
    expect(await cancelActiveMovieDownloads(1, release)).toEqual({
      status: "cancelled",
      cancelled: 1,
    });
    expect(remove).toHaveBeenCalledWith(hash, true);
    expect(revert).toHaveBeenCalledTimes(1);
  });

  it("keeps the data when another download shares the torrent", async () => {
    sharedCount = 1;
    await cancelActiveMovieDownloads(1, release);
    expect(remove).toHaveBeenCalledWith(hash, false);
  });

  it("does not touch the torrent when the row completed meanwhile", async () => {
    claimCount = 0;
    const result = await cancelActiveMovieDownloads(1, release);
    expect(result.status).toBe("refused");
    expect(remove).not.toHaveBeenCalled();
  });

  it("undoes the claim and refuses on a client error", async () => {
    remove.mockImplementation(async () => {
      throw new Error("client down");
    });
    getTorrent.mockImplementation(async () => ({ hash }));
    const result = await cancelActiveMovieDownloads(1, release);
    expect(result.status).toBe("refused");
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { failed: false, failReason: null },
    });
    expect(revert).not.toHaveBeenCalled();
  });

  it("treats a torrent the client no longer has as removed", async () => {
    remove.mockImplementation(async () => {
      throw new Error("not found");
    });
    const result = await cancelActiveMovieDownloads(1, release);
    expect(result).toEqual({ status: "cancelled", cancelled: 1 });
  });

  it("does nothing when the running download is the requested release", async () => {
    const result = await cancelActiveMovieDownloads(1, {
      ...release,
      releaseTitle: " old.release.1080p ",
    });
    expect(result).toEqual({ status: "already_active" });
    expect(remove).not.toHaveBeenCalled();
  });

  it("still clears a stale downloading status when no row is active", async () => {
    rows = [];
    expect(await cancelActiveMovieDownloads(1, release)).toEqual({
      status: "cancelled",
      cancelled: 0,
    });
    expect(mediaUpdateMany).toHaveBeenCalled();
  });
});
