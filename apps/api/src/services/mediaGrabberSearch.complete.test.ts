import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const realDb = { ...(await import("@rawkoon/api/db")) };
const realIndexer = {
  ...(await import("@rawkoon/api/services/indexerManager")),
};
const realStrategy = {
  ...(await import("@rawkoon/api/services/indexerManager/searchStrategy")),
};
const realGrab = {
  ...(await import("@rawkoon/api/services/mediaGrabberGrab")),
};
const realAi = { ...(await import("@rawkoon/api/services/aiProvider/client")) };

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    libraryMedia: {
      findUnique: mock(async () => ({
        title: "Show Name",
        year: 2020,
        type: "show",
        tmdbId: 4242,
        searchTitle: null,
        originalTitle: null,
      })),
    },
    libraryEpisode: { findUnique: mock(async () => null) },
    qualityProfile: { findUnique: mock(async () => null) },
    grabBlocklist: { findMany: mock(async () => []) },
  },
}));

const release = (title: string) => ({
  guid: title,
  title,
  magnetUrl: `magnet:?xt=urn:btih:${title}`,
  downloadUrl: null,
  sizeBytes: 1e9,
  seeders: 10,
  indexer: "idx",
  rejected: false,
  freeleech: false,
  publishedAt: null,
});

let titles: string[] = [];
const tiered = mock(async (_adapter: unknown, _opts: unknown) => ({
  releases: titles.map(release),
  indexerWarnings: [],
}));
const freetext = mock(async () => ({ releases: [], indexerWarnings: [] }));
mock.module("@rawkoon/api/services/indexerManager", () => ({
  ...realIndexer,
  getActiveIndexerManager: async () => ({ search: freetext }),
}));
mock.module("@rawkoon/api/services/indexerManager/searchStrategy", () => ({
  ...realStrategy,
  tieredSearch: tiered,
}));

const grabRelease = mock(
  async (_o: unknown) =>
    ({ grabbed: true, releaseTitle: "x" }) as
      | { grabbed: true; releaseTitle: string }
      | { grabbed: false; reason: string },
);
mock.module("@rawkoon/api/services/mediaGrabberGrab", () => ({ grabRelease }));
mock.module("@rawkoon/api/services/aiProvider/client", () => ({
  ...realAi,
  pickReleaseWithAi: mock(async () => null),
  loadEnabledAiProviderConfig: mock(async () => null),
}));

const { searchAndGrabWithTitleFallback } = await import("./mediaGrabberSearch");

afterAll(() => {
  mock.module("@rawkoon/api/db", () => realDb);
  mock.module("@rawkoon/api/services/indexerManager", () => realIndexer);
  mock.module(
    "@rawkoon/api/services/indexerManager/searchStrategy",
    () => realStrategy,
  );
  mock.module("@rawkoon/api/services/mediaGrabberGrab", () => realGrab);
  mock.module("@rawkoon/api/services/aiProvider/client", () => realAi);
});

const search = (completeSeasons: number[]) =>
  searchAndGrabWithTitleFallback({
    trigger: "scheduled",
    mediaId: 1,
    mediaType: "tv",
    titleBaseQueries: ["Show Name"],
    suffix: "",
    completeSeasons,
    qualityProfileId: null,
  });

beforeEach(() => {
  grabRelease.mockClear();
  tiered.mockClear();
  freetext.mockClear();
});

describe("searchAndGrab for a complete-series pack", () => {
  it("runs the complete-series search with the TMDB id, not a freetext query", async () => {
    titles = [];
    await search([1, 2, 3]);
    expect(tiered.mock.calls[0]?.[1]).toMatchObject({
      query: "Show Name",
      tmdbId: 4242,
      complete: true,
      mediaType: "tv",
    });
    expect(freetext).not.toHaveBeenCalled();
  });

  it("grabs the pack covering every season, as a show-level grab", async () => {
    titles = [
      "Show.Name.S01E01.1080p.WEB-DL",
      "Show.Name.S01.1080p.WEB-DL",
      "Show.Name.S01-S02.1080p.WEB-DL",
      "Show.Name.S01-S03.COMPLETE.1080p.WEB-DL",
    ];
    const result = await search([1, 2, 3]);
    expect(result.grabbed).toBe(true);
    expect(grabRelease).toHaveBeenCalledTimes(1);
    const call = grabRelease.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.releaseTitle).toBe("Show.Name.S01-S03.COMPLETE.1080p.WEB-DL");
    expect(call.episodeId).toBeUndefined();
    expect(call.season).toBeUndefined();
  });

  it("accepts an unranged integrale", async () => {
    titles = ["Show.Name.Integrale.MULTi.1080p.WEB"];
    expect((await search([1, 2])).grabbed).toBe(true);
  });

  it("misses when no pack reaches every wanted season", async () => {
    titles = [
      "Show.Name.S01E01.1080p.WEB-DL",
      "Show.Name.S01.1080p.WEB-DL",
      "Show.Name.S01-S02.1080p.WEB-DL",
    ];
    const result = await search([1, 2, 3]);
    expect(result.grabbed).toBe(false);
    expect(grabRelease).not.toHaveBeenCalled();
  });

  it("ignores a pack for another show", async () => {
    titles = ["Other.Series.Integrale.MULTi.1080p.WEB"];
    expect((await search([1, 2])).grabbed).toBe(false);
    expect(grabRelease).not.toHaveBeenCalled();
  });
});
