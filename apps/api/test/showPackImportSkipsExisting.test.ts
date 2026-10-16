import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const realDb = { ...(await import("@rawkoon/api/db")) };
const realScanner = {
  ...(await import("@rawkoon/api/utils/medias/mediainfoScanner")),
};

type Ep = { id: number; season: number; episode: number; title: string | null };
const episodes: Ep[] = [
  { id: 101, season: 1, episode: 1, title: null },
  { id: 201, season: 2, episode: 1, title: null },
];
let filesFor: number[] = [];
const createdFiles: Array<{ episodeId: number; filePath: string }> = [];
const updatedFiles: unknown[] = [];

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    libraryEpisode: {
      findMany: async () => episodes,
      update: async () => ({}),
    },
    mediaFile: {
      findMany: async () => filesFor.map((episodeId) => ({ episodeId })),
      findFirst: async () => null,
      create: async (a: { data: { episodeId: number; filePath: string } }) => {
        createdFiles.push(a.data);
        return {};
      },
      update: async (a: unknown) => {
        updatedFiles.push(a);
        return {};
      },
    },
    libraryMedia: { update: async () => ({}) },
    downloadHistory: { update: async () => ({}), findMany: async () => [] },
    grabBlocklist: { create: async () => ({}) },
  },
}));
mock.module("@rawkoon/api/utils/medias/mediainfoScanner", () => ({
  ...realScanner,
  scanMediaInfo: async () => null,
}));

const { postProcessSeasonPack } = await import(
  "@rawkoon/api/services/postProcessorSeasonPack"
);

afterAll(() => {
  mock.module("@rawkoon/api/db", () => realDb);
  mock.module("@rawkoon/api/utils/medias/mediainfoScanner", () => realScanner);
});

const adapter = (dir: string) =>
  new Proxy(
    {
      type: "qbittorrent",
      getTorrent: async () => ({
        contentPath: dir,
        savePath: dir,
        name: "pack",
        ratio: 0,
        seedingTimeSecs: 0,
      }),
    },
    { get: (t, k) => (t as never)[k] ?? (async () => undefined) },
  ) as never;

function run(isUpgrade: boolean) {
  const root = mkdtempSync(join(tmpdir(), "pack-"));
  const dl = join(root, "dl");
  mkdirSync(dl, { recursive: true });
  writeFileSync(join(dl, "Show.S01E01.1080p.mkv"), "a");
  writeFileSync(join(dl, "Show.S02E01.1080p.mkv"), "b");
  return postProcessSeasonPack(
    1,
    {
      id: 1,
      media: {
        id: 7,
        type: "show",
        title: "Show",
        year: 2020,
        tmdbStatus: null,
      },
      episode: null,
      season: null,
      torrentHash: "abc",
      indexer: null,
      releaseTitle: "Show.S01-S02.COMPLETE.1080p",
      qualityParsed: null,
      isUpgrade,
    },
    {
      showsLibraryPath: join(root, "lib"),
      episodeTemplate:
        "{show}/Season {season}/{show} - S{season:02}E{episode:02}",
      fileOperation: "hardlink",
      seedSweepEnabled: true,
    },
    "hardlink",
    adapter(dl),
  );
}

beforeEach(() => {
  filesFor = [];
  createdFiles.length = 0;
  updatedFiles.length = 0;
});

describe("show-level pack import", () => {
  it("leaves an episode that already has a file alone and imports the rest", async () => {
    filesFor = [101];
    const result = await run(false);
    expect(result).toMatchObject({ success: true, episodeCount: 1 });
    expect(createdFiles.map((f) => f.episodeId)).toEqual([201]);
    expect(updatedFiles).toHaveLength(0);
  });

  it("imports nothing when every episode already has a file", async () => {
    filesFor = [101, 201];
    const result = await run(false);
    expect(result.success).toBe(false);
    expect(createdFiles).toHaveLength(0);
  });

  it("replaces existing files for an upgrade", async () => {
    filesFor = [101, 201];
    const result = await run(true);
    expect(result).toMatchObject({ success: true, episodeCount: 2 });
  });
});
