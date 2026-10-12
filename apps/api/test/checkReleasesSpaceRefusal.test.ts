import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

// A space refusal must leave the item wanted: no attempt bump, no skip, no
// notification. Any other failure still counts as an attempt.
const realSearch = {
  ...(await import("@rawkoon/api/services/mediaGrabberSearch")),
};
const realNotify = {
  ...(await import("@rawkoon/api/workers/notifyLibraryGrabSkipped")),
};
const realRefresh = {
  ...(await import("@rawkoon/api/services/libraryTmdbRefresh")),
};

// 1 = the lone wanted episode is a whole season (pack path); 2 = individual path.
let monitoredTotal = 1;
let grabResult: { grabbed: false; reason: string };
const mediaUpdates: Record<string, unknown>[] = [];
const episodeUpdates: Record<string, unknown>[] = [];
const notifications: unknown[] = [];

const SPACE =
  "Not enough free space: needs 50.0 GB, 5.0 GB free, keeping 10 GB";

mock.module("@rawkoon/api/services/mediaGrabberSearch", () => ({
  ...realSearch,
  searchAndGrabWithTitleFallback: async () => grabResult,
}));
mock.module("@rawkoon/api/workers/notifyLibraryGrabSkipped", () => ({
  ...realNotify,
  notifyAdminsLibraryGrabSkipped: async (a: unknown) => {
    notifications.push(a);
  },
}));
mock.module("@rawkoon/api/services/libraryTmdbRefresh", () => ({
  ...realRefresh,
  refreshLibraryMovieDigitalDate: async () => new Date("2020-01-01"),
}));
mock.module("@rawkoon/api/db", () => ({
  prisma: {
    libraryMedia: {
      findMany: async () => [
        {
          id: 1,
          title: "Some Movie",
          searchTitle: null,
          originalTitle: null,
          year: 2020,
          qualityProfileId: null,
          searchAttempts: 23,
          digitalReleaseDate: new Date("2020-01-01"),
        },
      ],
      update: async (a: { data: Record<string, unknown> }) => {
        mediaUpdates.push(a.data);
        return {};
      },
    },
    libraryEpisode: {
      findMany: async () => [
        {
          id: 10,
          mediaId: 2,
          season: 1,
          episode: 1,
          searchAttempts: 23,
          media: {
            id: 2,
            title: "Some Show",
            searchTitle: null,
            originalTitle: null,
            qualityProfileId: null,
          },
        },
      ],
      groupBy: async () => [
        { mediaId: 2, season: 1, _count: { _all: monitoredTotal } },
      ],
      update: async (a: { data: Record<string, unknown> }) => {
        episodeUpdates.push(a.data);
        return {};
      },
    },
  },
}));

const { checkMovieReleases } = await import(
  "@rawkoon/api/workers/checkMovieReleases"
);
const { checkEpisodeReleases } = await import(
  "@rawkoon/api/workers/checkEpisodeReleases"
);

afterAll(() => {
  mock.module("@rawkoon/api/services/mediaGrabberSearch", () => realSearch);
  mock.module(
    "@rawkoon/api/workers/notifyLibraryGrabSkipped",
    () => realNotify,
  );
  mock.module("@rawkoon/api/services/libraryTmdbRefresh", () => realRefresh);
});

beforeEach(() => {
  mediaUpdates.length = 0;
  episodeUpdates.length = 0;
  notifications.length = 0;
});

describe("cron release checks on a space refusal", () => {
  it("movie: leaves the item untouched", async () => {
    grabResult = { grabbed: false, reason: SPACE };
    await checkMovieReleases();
    expect(mediaUpdates).toHaveLength(0);
    expect(notifications).toHaveLength(0);
  });

  it("movie: still counts and skips on any other failure", async () => {
    grabResult = { grabbed: false, reason: "No matching releases found" };
    await checkMovieReleases();
    expect(mediaUpdates).toEqual([{ searchAttempts: 24, status: "skipped" }]);
    expect(notifications).toHaveLength(1);
  });

  for (const [label, total] of [
    ["season pack", 1],
    ["individual", 2],
  ] as const) {
    it(`episode (${label}): leaves the episode untouched`, async () => {
      monitoredTotal = total;
      grabResult = { grabbed: false, reason: SPACE };
      await checkEpisodeReleases();
      expect(episodeUpdates).toHaveLength(0);
      expect(notifications).toHaveLength(0);
    });

    it(`episode (${label}): still counts and skips on any other failure`, async () => {
      monitoredTotal = total;
      grabResult = { grabbed: false, reason: "No matching releases found" };
      await checkEpisodeReleases();
      expect(episodeUpdates).toEqual([
        { searchAttempts: 24, status: "skipped" },
      ]);
      expect(notifications).toHaveLength(1);
    });
  }
});
