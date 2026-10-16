import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

// POST /api/library must answer without waiting for the search: it only queues one.
const realQueue = { ...(await import("@rawkoon/api/services/queueService")) };
const realTmdb = {
  ...(await import("@rawkoon/api/services/libraryFromTmdb")),
};
const realCache = { ...(await import("@rawkoon/api/services/cache")) };
const realRegion = {
  ...(await import("@rawkoon/api/utils/medias/tmdbRegion")),
};
const realHelpers = {
  ...(await import("@rawkoon/api/routes/library/libraryHelpers")),
};
const realAuth = { ...(await import("@rawkoon/api/middleware/hono/auth")) };

let searchOnAddSetting: boolean | null = true;
let added: Record<string, unknown>;
const jobs: Array<{ jobName: string; data: unknown; opts: unknown }> = [];
const settingsUpdates: unknown[] = [];

mock.module("@rawkoon/api/services/queueService", () => ({
  ...realQueue,
  QUEUE_NAMES: { SCHEDULED_TASKS: "scheduled-tasks" },
  SCHEDULED_JOB_NAMES: { SEARCH_ON_ADD: "search-on-add" },
  addJob: async (_q: string, jobName: string, data: unknown, opts: unknown) => {
    jobs.push({ jobName, data, opts });
    return {};
  },
}));
mock.module("@rawkoon/api/services/libraryFromTmdb", () => ({
  ...realTmdb,
  addOrUpdateLibraryFromTmdb: async () => added,
}));
mock.module("@rawkoon/api/services/cache", () => ({
  ...realCache,
  deleteCache: async () => {},
}));
mock.module("@rawkoon/api/utils/medias/tmdbRegion", () => ({
  ...realRegion,
  getGlobalTmdbRegion: async () => "US",
}));
mock.module("@rawkoon/api/routes/library/libraryHelpers", () => ({
  ...realHelpers,
  mapLibraryMedia: (item: { id: number }) => ({ id: item.id }),
}));
mock.module("@rawkoon/api/middleware/hono/auth", () => ({
  ...realAuth,
  requireUser: async (_c: unknown, next: () => Promise<void>) => next(),
  requireAdmin: async (_c: unknown, next: () => Promise<void>) => next(),
  ensureAdmin: () => null,
}));
const aired = (season: number, over: Record<string, unknown> = {}) => ({
  season,
  status: "wanted",
  airDate: new Date("2020-01-01"),
  _count: { files: 0 },
  ...over,
});
let episodeRows: Record<string, unknown>[] = [];

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    downloadHistory: { findMany: async () => [] },
    libraryEpisode: {
      findMany: async (a: { where?: { status?: string } }) =>
        a.where?.status
          ? episodeRows.filter((r) => r.status === a.where?.status)
          : episodeRows,
    },
    mediaSettings: {
      findUnique: async () =>
        searchOnAddSetting === null
          ? null
          : {
              id: 1,
              searchOnAdd: searchOnAddSetting,
              fileOperation: "hardlink",
              movieTemplate: "",
              episodeTemplate: "",
              minSeedRatio: 1,
              postProcessingEnabled: false,
              moviesLibraryPath: null,
              showsLibraryPath: null,
              downloadsPath: null,
              updatedAt: new Date(),
            },
      create: async () => ({}),
      update: async (a: { data: Record<string, unknown> }) => {
        settingsUpdates.push(a.data);
        return {
          id: 1,
          searchOnAdd: a.data.searchOnAdd,
          fileOperation: "hardlink",
          movieTemplate: "",
          episodeTemplate: "",
          minSeedRatio: 1,
          postProcessingEnabled: false,
          moviesLibraryPath: null,
          showsLibraryPath: null,
          downloadsPath: null,
          updatedAt: new Date(),
        };
      },
    },
  },
}));

const { libraryListRoutes } = await import(
  "@rawkoon/api/routes/library/libraryListRoutes"
);
const { libraryMediaAdminRoutes } = await import(
  "@rawkoon/api/routes/library/libraryMediaAdmin"
);

afterAll(() => {
  mock.module("@rawkoon/api/services/queueService", () => realQueue);
  mock.module("@rawkoon/api/services/libraryFromTmdb", () => realTmdb);
  mock.module("@rawkoon/api/services/cache", () => realCache);
  mock.module("@rawkoon/api/utils/medias/tmdbRegion", () => realRegion);
  mock.module("@rawkoon/api/routes/library/libraryHelpers", () => realHelpers);
  mock.module("@rawkoon/api/middleware/hono/auth", () => realAuth);
});

async function add(body: Record<string, unknown>) {
  const res = await libraryListRoutes.request("http://localhost/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as Record<string, unknown>;
}

const movie = { tmdb_id: 1, type: "movie" };

beforeEach(() => {
  episodeRows = [aired(1), aired(2)];
  jobs.length = 0;
  settingsUpdates.length = 0;
  searchOnAddSetting = true;
  added = {
    id: 5,
    type: "movie",
    status: "wanted",
    monitored: true,
    digitalReleaseDate: new Date("2020-01-01"),
  };
});

describe("POST /api/library search on add", () => {
  it("queues a search by default and says so", async () => {
    const body = await add(movie);
    expect(body).toMatchObject({
      search_queued: true,
      search_skipped_reason: null,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].jobName).toBe("search-on-add");
    expect(jobs[0].data).toEqual({ mediaId: 5 });
  });

  it("queues when no settings row exists yet (on by default)", async () => {
    searchOnAddSetting = null;
    expect((await add(movie)).search_queued).toBe(true);
  });

  it("does not queue when the setting is off", async () => {
    searchOnAddSetting = false;
    const body = await add(movie);
    expect(body).toMatchObject({
      search_queued: false,
      search_skipped_reason: "setting_off",
    });
    expect(jobs).toHaveLength(0);
  });

  it("search_on_add:false skips even when the setting is on", async () => {
    const body = await add({ ...movie, search_on_add: false });
    expect(body.search_skipped_reason).toBe("override_off");
    expect(jobs).toHaveLength(0);
  });

  it("search_on_add:true searches even when the setting is off", async () => {
    searchOnAddSetting = false;
    expect((await add({ ...movie, search_on_add: true })).search_queued).toBe(
      true,
    );
  });

  it("does not queue an unreleased movie and returns its date", async () => {
    added = { ...added, digitalReleaseDate: new Date("2999-03-04") };
    const body = await add(movie);
    expect(body).toMatchObject({
      search_queued: false,
      search_skipped_reason: "not_released",
      digital_release_date: "2999-03-04",
    });
    expect(jobs).toHaveLength(0);
  });

  it("queues a show", async () => {
    added = {
      id: 6,
      type: "show",
      status: "wanted",
      monitored: true,
      digitalReleaseDate: null,
    };
    expect((await add({ tmdb_id: 2, type: "show" })).search_queued).toBe(true);
    // A clean-slate show starts with the complete-series job, which queues the seasons itself.
    expect(jobs.map((j) => j.data)).toEqual([{ mediaId: 6, series: true }]);
  });

  it("queues one job per aired season for a show that is partly downloaded", async () => {
    episodeRows = [aired(1, { status: "downloaded" }), aired(2)];
    added = {
      id: 6,
      type: "show",
      status: "wanted",
      monitored: true,
      digitalReleaseDate: null,
    };
    expect((await add({ tmdb_id: 2, type: "show" })).search_queued).toBe(true);
    expect(jobs.map((j) => j.data)).toEqual([{ mediaId: 6, season: 2 }]);
  });

  it("does not queue an unmonitored title", async () => {
    added = { ...added, monitored: false };
    const body = await add(movie);
    expect(body.search_skipped_reason).toBe("not_monitored");
    expect(jobs).toHaveLength(0);
  });
});

describe("media settings search_on_add", () => {
  it("is returned by GET and saved by PATCH", async () => {
    searchOnAddSetting = false;
    const get = await libraryMediaAdminRoutes.request(
      "http://localhost/post-processing/settings",
    );
    expect(((await get.json()) as any).settings.search_on_add).toBe(false);

    const patch = await libraryMediaAdminRoutes.request(
      "http://localhost/post-processing/settings",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ search_on_add: true }),
      },
    );
    expect(settingsUpdates).toEqual([{ searchOnAdd: true }]);
    expect(((await patch.json()) as any).settings.search_on_add).toBe(true);
  });
});
