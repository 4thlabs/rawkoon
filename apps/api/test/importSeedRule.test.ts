import { describe, expect, it, mock, afterAll } from "bun:test";

mock.module("@rawkoon/api/services/seeding/seedSweep", () => ({
  loadSeedContext: async () => ({
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
  }),
}));

const { loadImportSeedRule } = await import(
  "@rawkoon/api/services/seeding/importSeedRule"
);

afterAll(() => mock.restore());

const base = { type: "qbittorrent" as const, seedSweepEnabled: false };

describe("loadImportSeedRule", () => {
  it("uses the private default for a private or unknown indexer", async () => {
    const want = { ratio: 3, seedTimeMins: 120 };
    expect(await loadImportSeedRule({ ...base, indexer: "Priv" })).toEqual(
      want,
    );
    expect(await loadImportSeedRule({ ...base, indexer: null })).toEqual(want);
  });

  it("uses the public default for a public indexer", async () => {
    expect(await loadImportSeedRule({ ...base, indexer: "Pub" })).toEqual({
      ratio: 1,
      seedTimeMins: null,
    });
  });

  it("lets a per-indexer override win", async () => {
    expect(await loadImportSeedRule({ ...base, indexer: "Special" })).toEqual({
      ratio: 5,
      seedTimeMins: null,
    });
  });
});
