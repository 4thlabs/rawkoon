import { beforeEach, describe, expect, it, mock } from "bun:test";

const remove = mock(async (_hash: string, _deleteData: boolean) => {});
const update = mock(async (_arg: unknown) => ({}));
const updateMany = mock(async (_arg: unknown) => ({ count: 1 }));
const revert = mock(async (_dh: unknown) => {});
let rows: {
  id: number;
  mediaId: number;
  episodeId: null;
  torrentHash: string | null;
}[] = [];
let sharedCount = 0;

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    downloadHistory: {
      findMany: async () => rows,
      count: async () => sharedCount,
      update,
    },
    libraryMedia: { updateMany },
  },
}));
mock.module("@rawkoon/api/services/downloadClient/registry", () => ({
  resolveActiveAdapter: async () => ({ adapter: { remove } }),
}));
mock.module("@rawkoon/api/services/downloadOutcome", () => ({
  revertToWantedIfNoActiveGrabs: revert,
}));
mock.module("@rawkoon/api/services/libraryEvents", () => ({
  emitLibraryUpdate: () => {},
}));

const { cancelActiveMovieDownloads, REPLACED_FAIL_REASON } = await import(
  "./replaceActiveDownload"
);

describe("cancelActiveMovieDownloads", () => {
  beforeEach(() => {
    remove.mockClear();
    update.mockClear();
    revert.mockClear();
    sharedCount = 0;
    rows = [{ id: 7, mediaId: 1, episodeId: null, torrentHash: "abc" }];
  });

  it("removes the torrent with its data and marks the row replaced", async () => {
    expect(await cancelActiveMovieDownloads(1)).toEqual({ cancelled: 1 });
    expect(remove).toHaveBeenCalledWith("abc", true);
    expect(update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { failed: true, failReason: REPLACED_FAIL_REASON },
    });
    expect(revert).toHaveBeenCalledTimes(1);
  });

  it("keeps the data when another download shares the torrent", async () => {
    sharedCount = 1;
    await cancelActiveMovieDownloads(1);
    expect(remove).toHaveBeenCalledWith("abc", false);
  });

  it("still clears a stale downloading status when no row is active", async () => {
    rows = [];
    expect(await cancelActiveMovieDownloads(1)).toEqual({ cancelled: 0 });
    expect(remove).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalled();
  });
});
