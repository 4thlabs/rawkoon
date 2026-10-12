import { afterAll, describe, expect, it, mock } from "bun:test";

let contextFails = false;
let sharedIndexers: Array<string | null> = [];

mock.module("@rawkoon/api/services/seeding/seedSweep", () => ({
  loadSeedContext: async () => {
    if (contextFails) throw new Error("db down");
    return {
      defaults: {
        publicRule: { ratio: 1, seedTimeMins: null },
        privateRule: { ratio: 3, seedTimeMins: 120 },
      },
      overrides: new Map([["special", { ratio: 5, seedTimeMins: null }]]),
      privacy: new Map([
        ["pub", false],
        ["special", true],
      ]),
      moveMode: false,
    };
  },
}));

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    downloadHistory: {
      findMany: async () => sharedIndexers.map((indexer) => ({ indexer })),
    },
  },
}));

const { loadImportSeedRules } = await import(
  "@rawkoon/api/services/seeding/importSeedRule"
);

afterAll(() => mock.restore());

const base = {
  hash: "aa".repeat(20),
  type: "qbittorrent" as const,
  seedSweepEnabled: false,
};
const PUBLIC = { ratio: 1, seedTimeMins: null };
const PRIVATE = { ratio: 3, seedTimeMins: 120 };

describe("loadImportSeedRules", () => {
  it("uses the private default for a private indexer", async () => {
    sharedIndexers = ["Priv"];
    expect(await loadImportSeedRules({ ...base, indexer: "Priv" })).toEqual([
      PRIVATE,
    ]);
  });

  it("requires both defaults when the indexer is unknown", async () => {
    sharedIndexers = [null];
    expect(await loadImportSeedRules({ ...base, indexer: null })).toEqual([
      PUBLIC,
      PRIVATE,
    ]);
  });

  it("uses the public default for a public indexer", async () => {
    sharedIndexers = ["Pub"];
    expect(await loadImportSeedRules({ ...base, indexer: "Pub" })).toEqual([
      PUBLIC,
    ]);
  });

  it("lets a per-indexer override win", async () => {
    sharedIndexers = ["Special"];
    expect(await loadImportSeedRules({ ...base, indexer: "Special" })).toEqual([
      { ratio: 5, seedTimeMins: null },
    ]);
  });

  it("includes the targets of every row sharing the torrent", async () => {
    sharedIndexers = ["Pub", "Special"];
    expect(await loadImportSeedRules({ ...base, indexer: "Pub" })).toEqual([
      PUBLIC,
      { ratio: 5, seedTimeMins: null },
    ]);
  });

  it("skips the lookup for a debrid client or when the sweep is on", async () => {
    expect(
      await loadImportSeedRules({ ...base, indexer: "Pub", type: "rdtclient" }),
    ).toEqual([]);
    expect(
      await loadImportSeedRules({
        ...base,
        indexer: "Pub",
        seedSweepEnabled: true,
      }),
    ).toEqual([]);
  });

  it("returns null when the seed context can't be loaded", async () => {
    contextFails = true;
    try {
      expect(await loadImportSeedRules({ ...base, indexer: "Pub" })).toBeNull();
    } finally {
      contextFails = false;
    }
  });
});
