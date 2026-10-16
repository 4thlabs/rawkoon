import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

// Search-on-add reuses the scheduled grab path but must never record a miss.
const realSearch = {
  ...(await import("@rawkoon/api/services/mediaGrabberSearch")),
};
const realRefresh = {
  ...(await import("@rawkoon/api/services/libraryTmdbRefresh")),
};

type Ep = {
  id: number;
  season: number;
  episode: number;
  status: string;
  airDate: Date | null;
  _count: { files: number };
};

let media: Record<string, unknown> | null;
let episodes: Ep[];
let refreshedDate: Date | null;
let searchError: Error | null = null;
let packResult: { grabbed: boolean; reason: string; delayed?: true };
const searches: Array<{ suffix: string; season?: number; episodeId?: number }> =
  [];
const writes: unknown[] = [];
const outcomes: Array<Record<string, unknown>> = [];

mock.module("@rawkoon/api/services/mediaGrabberSearch", () => ({
  ...realSearch,
  searchAndGrabWithTitleFallback: async (o: {
    suffix: string;
    season?: number;
    episodeId?: number;
    trigger?: string;
  }) => {
    searches.push({
      suffix: o.suffix,
      season: o.season,
      episodeId: o.episodeId,
    });
    expect(o.trigger).toBe("scheduled");
    if (searchError) throw searchError;
    return o.episodeId == null && o.season != null
      ? packResult
      : { grabbed: false, reason: "No matching releases found" };
  },
}));
mock.module("@rawkoon/api/services/libraryTmdbRefresh", () => ({
  ...realRefresh,
  refreshLibraryMovieDigitalDate: async () => refreshedDate,
}));
mock.module("@rawkoon/api/db", () => ({
  prisma: {
    libraryMedia: {
      findUnique: async () => media,
      update: async (a: { data: Record<string, unknown> }) => {
        // The stored search outcome is the one write a search-on-add may make.
        if ("lastSearchAt" in a.data) outcomes.push(a.data);
        else writes.push(a);
        return {};
      },
    },
    libraryEpisode: {
      findMany: async (a: { where: { season: number | { gt: number } } }) =>
        episodes.filter((e) =>
          typeof a.where.season === "number"
            ? e.season === a.where.season
            : e.season > a.where.season.gt,
        ),
      update: async (a: unknown) => {
        writes.push(a);
        return {};
      },
    },
  },
}));

const { searchOnAdd } = await import("@rawkoon/api/workers/searchOnAdd");

afterAll(() => {
  mock.module("@rawkoon/api/services/mediaGrabberSearch", () => realSearch);
  mock.module("@rawkoon/api/services/libraryTmdbRefresh", () => realRefresh);
});

const base = {
  id: 1,
  monitored: true,
  title: "Some Title",
  searchTitle: null,
  originalTitle: null,
  year: 2020,
  qualityProfileId: null,
};
const past = new Date("2020-01-01");
const ep = (season: number, episode: number, over: Partial<Ep> = {}): Ep => ({
  id: season * 100 + episode,
  season,
  episode,
  status: "wanted",
  airDate: past,
  _count: { files: 0 },
  ...over,
});

beforeEach(() => {
  searches.length = 0;
  writes.length = 0;
  outcomes.length = 0;
  episodes = [];
  refreshedDate = null;
  searchError = null;
  packResult = { grabbed: false, reason: "No matching releases found" };
});

describe("searchOnAdd worker: movies", () => {
  it("searches a released wanted movie and records nothing on a miss", async () => {
    media = {
      ...base,
      type: "movie",
      status: "wanted",
      digitalReleaseDate: past,
      _count: { files: 0 },
    };
    await searchOnAdd(1);
    expect(searches).toEqual([{ suffix: " 2020" }]);
    expect(writes).toHaveLength(0);
    expect(outcomes).toMatchObject([{ lastSearchOutcome: "no_match" }]);
  });

  it("records that an unreleased movie is waiting on its digital release", async () => {
    media = {
      ...base,
      type: "movie",
      status: "wanted",
      digitalReleaseDate: null,
      _count: { files: 0 },
    };
    await searchOnAdd(1);
    expect(outcomes).toMatchObject([{ lastSearchOutcome: "not_released" }]);
  });

  it("re-validates a missing date and skips when TMDB still has none", async () => {
    media = {
      ...base,
      type: "movie",
      status: "wanted",
      digitalReleaseDate: null,
      _count: { files: 0 },
    };
    await searchOnAdd(1);
    expect(searches).toHaveLength(0);
  });

  it("searches once the refreshed date has passed", async () => {
    media = {
      ...base,
      type: "movie",
      status: "wanted",
      digitalReleaseDate: null,
      _count: { files: 0 },
    };
    refreshedDate = past;
    await searchOnAdd(1);
    expect(searches).toHaveLength(1);
  });

  it("tells the toast about a failure only on the last attempt", async () => {
    media = {
      ...base,
      type: "movie",
      status: "wanted",
      digitalReleaseDate: past,
      _count: { files: 0 },
    };
    searchError = new Error("connect ECONNREFUSED http://indexer.internal");
    await expect(searchOnAdd(1, undefined, false)).rejects.toThrow();
    expect(outcomes).toHaveLength(0);
    await expect(searchOnAdd(1, undefined, true)).rejects.toThrow();
    expect(outcomes).toMatchObject([
      { lastSearchOutcome: "error", lastSearchReason: "The search failed" },
    ]);
  });

  it("skips a movie that already has files", async () => {
    media = {
      ...base,
      type: "movie",
      status: "wanted",
      digitalReleaseDate: past,
      _count: { files: 1 },
    };
    await searchOnAdd(1);
    expect(searches).toHaveLength(0);
  });

  it("skips an unmonitored movie", async () => {
    media = {
      ...base,
      monitored: false,
      type: "movie",
      status: "wanted",
      digitalReleaseDate: past,
      _count: { files: 0 },
    };
    await searchOnAdd(1);
    expect(searches).toHaveLength(0);
  });

  it("returns quietly when the title was removed", async () => {
    media = null;
    await searchOnAdd(1);
    expect(searches).toHaveLength(0);
  });
});

describe("searchOnAdd worker: shows", () => {
  beforeEach(() => {
    media = { ...base, type: "show", status: "wanted", _count: { files: 0 } };
  });

  it("looks for a pack in every fully aired season and skips unaired ones", async () => {
    packResult = { grabbed: true, reason: "" };
    episodes = [
      ep(1, 1),
      ep(1, 2),
      ep(2, 1),
      ep(2, 2),
      ep(3, 1, { airDate: new Date("2999-01-01") }),
    ];
    await searchOnAdd(1);
    expect(searches).toEqual([
      { suffix: " S01", season: 1, episodeId: undefined },
      { suffix: " S02", season: 2, episodeId: undefined },
    ]);
    expect(writes).toHaveLength(0);
  });

  it("reports one outcome for the season it searched", async () => {
    packResult = { grabbed: true, reason: "" };
    episodes = [ep(1, 1), ep(1, 2), ep(2, 1)];
    await searchOnAdd(1, 1);
    expect(outcomes).toMatchObject([{ lastSearchOutcome: "grabbed" }]);
  });

  it("reports a season with nothing aired as waiting", async () => {
    episodes = [ep(1, 1, { airDate: new Date("2999-01-01") })];
    await searchOnAdd(1, 1);
    expect(outcomes).toMatchObject([{ lastSearchOutcome: "not_released" }]);
  });

  it("falls back to aired episodes when the pack misses, never the unaired one", async () => {
    episodes = [ep(1, 1), ep(1, 2)];
    await searchOnAdd(1);
    expect(searches.map((s) => s.suffix)).toEqual([
      " S01",
      " S01E01",
      " S01E02",
    ]);
    expect(writes).toHaveLength(0);
  });

  it("searches a partly aired season episode by episode", async () => {
    episodes = [ep(1, 1), ep(1, 2, { airDate: new Date("2999-01-01") })];
    await searchOnAdd(1);
    expect(searches.map((s) => s.suffix)).toEqual([" S01E01"]);
  });

  it("does not fall back after a delayed pack", async () => {
    packResult = { grabbed: false, reason: "Held", delayed: true };
    episodes = [ep(1, 1), ep(1, 2)];
    await searchOnAdd(1);
    expect(searches.map((s) => s.suffix)).toEqual([" S01"]);
  });

  it("skips an unmonitored show", async () => {
    media = { ...media, monitored: false };
    episodes = [ep(1, 1)];
    await searchOnAdd(1);
    expect(searches).toHaveLength(0);
  });

  it("a season job searches only that season", async () => {
    packResult = { grabbed: true, reason: "" };
    episodes = [ep(1, 1), ep(1, 2), ep(2, 1), ep(2, 2)];
    await searchOnAdd(1, 2);
    expect(searches).toEqual([
      { suffix: " S02", season: 2, episodeId: undefined },
    ]);
  });

  it("ignores specials and episodes that already have files", async () => {
    episodes = [
      ep(0, 1),
      ep(1, 1, { status: "downloaded", _count: { files: 1 } }),
      ep(1, 2),
    ];
    await searchOnAdd(1);
    expect(searches.map((s) => s.suffix)).toEqual([" S01E02"]);
  });
});
