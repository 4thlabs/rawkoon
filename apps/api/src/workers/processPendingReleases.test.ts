import { beforeEach, describe, expect, it, mock } from "bun:test";

type Row = {
  id: number;
  targetKey: string;
  mediaId: number;
  episodeId: number | null;
  season: number | null;
  release: Record<string, unknown>;
  score: number;
  grabAfter: Date;
  createdAt: Date;
};
let rows: Row[] = [];
let episode: unknown = null;
let media: unknown = null;

const deleteMany = mock(
  async ({
    where,
  }: {
    where: { targetKey?: string; createdAt?: { lt: Date } };
  }) => {
    rows = rows.filter((r) => {
      if (where.targetKey) return r.targetKey !== where.targetKey;
      if (where.createdAt) return !(r.createdAt < where.createdAt.lt);
      return true;
    });
  },
);

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    pendingRelease: {
      deleteMany,
      findMany: mock(
        async (a: {
          where: { targetKey?: string; grabAfter?: { lte: Date } };
          distinct?: string[];
        }) => {
          let out = rows;
          if (a.where.targetKey)
            out = out.filter((r) => r.targetKey === a.where.targetKey);
          if (a.where.grabAfter)
            out = out.filter((r) => r.grabAfter <= a.where.grabAfter!.lte);
          if (a.distinct) {
            const seen = new Set<string>();
            out = out.filter(
              (r) => !seen.has(r.targetKey) && seen.add(r.targetKey),
            );
          }
          return out;
        },
      ),
    },
    libraryEpisode: {
      findUnique: mock(async () => episode),
      count: mock(async () => 0),
    },
    libraryMedia: { findUnique: mock(async () => media) },
    qualityProfile: { findUnique: mock(async () => null) },
  },
}));

const grabRelease = mock(
  async (_o: { downloadUrl: string }) =>
    ({ grabbed: true, releaseTitle: "x" }) as
      | { grabbed: true; releaseTitle: string }
      | { grabbed: false; reason: string },
);
mock.module("@rawkoon/api/services/mediaGrabberGrab", () => ({ grabRelease }));

const { processPendingReleases } = await import("./processPendingReleases");

const NOW = new Date("2026-01-01T12:00:00Z");
const row = (
  id: number,
  guid: string,
  score: number,
  grabAfterMin: number,
): Row => ({
  id,
  targetKey: "e:7",
  mediaId: 1,
  episodeId: 7,
  season: null,
  release: {
    guid,
    title: `Show.S01E01.${guid}`,
    magnetUrl: `magnet:?xt=${guid}`,
    downloadUrl: null,
    indexer: "idx",
    sizeBytes: 1e9,
    seeders: 5,
    freeleech: false,
  },
  score,
  grabAfter: new Date(NOW.getTime() + grabAfterMin * 60_000),
  createdAt: new Date(NOW.getTime() - 3600_000),
});

const wantedEpisode = {
  monitored: true,
  status: "wanted",
  media: { monitored: true },
  _count: { files: 0 },
};

beforeEach(() => {
  rows = [];
  episode = wantedEpisode;
  media = { qualityProfileId: null };
  grabRelease.mockClear();
  grabRelease.mockImplementation(async () => ({
    grabbed: true,
    releaseTitle: "x",
  }));
});

describe("processPendingReleases", () => {
  it("leaves targets alone while their window is still open", async () => {
    rows = [row(1, "a", 1, 10)];
    const r = await processPendingReleases(NOW);
    expect(r).toEqual({ grabbed: 0, dropped: 0 });
    expect(grabRelease).not.toHaveBeenCalled();
    expect(rows).toHaveLength(1);
  });

  it("grabs the best candidate once the window elapsed, then clears the target", async () => {
    rows = [row(1, "low", 1, -5), row(2, "high", 9, 20)];
    const r = await processPendingReleases(NOW);
    expect(r.grabbed).toBe(1);
    expect(grabRelease).toHaveBeenCalledTimes(1);
    expect(grabRelease.mock.calls[0]![0].downloadUrl).toBe("magnet:?xt=high");
    expect(rows).toHaveLength(0);
  });

  it("falls through to the next candidate when a grab fails", async () => {
    rows = [row(1, "low", 1, -5), row(2, "high", 9, -5)];
    grabRelease.mockImplementationOnce(async () => ({
      grabbed: false,
      reason: "Blocklisted: bad",
    }));
    const r = await processPendingReleases(NOW);
    expect(grabRelease).toHaveBeenCalledTimes(2);
    expect(grabRelease.mock.calls[1]![0].downloadUrl).toBe("magnet:?xt=low");
    expect(r.grabbed).toBe(1);
    expect(rows).toHaveLength(0);
  });

  it("drops the target without grabbing when it is no longer wanted", async () => {
    rows = [row(1, "a", 1, -5)];
    episode = { ...wantedEpisode, status: "downloaded" };
    const r = await processPendingReleases(NOW);
    expect(r).toEqual({ grabbed: 0, dropped: 1 });
    expect(grabRelease).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });

  it("drops a target that already has a file", async () => {
    rows = [row(1, "a", 1, -5)];
    episode = { ...wantedEpisode, _count: { files: 1 } };
    await processPendingReleases(NOW);
    expect(grabRelease).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });

  it("expires rows older than a week", async () => {
    const stale = row(1, "a", 1, 600);
    stale.createdAt = new Date(NOW.getTime() - 8 * 86_400_000);
    rows = [stale];
    await processPendingReleases(NOW);
    expect(rows).toHaveLength(0);
  });
});
