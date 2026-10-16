import { afterAll, describe, expect, it, mock } from "bun:test";

const realDb = { ...(await import("@rawkoon/api/db")) };
let rows: Array<{ mediaId: number | null; releaseTitle: string }> = [];
let lastWhere: Record<string, unknown> = {};
let postProcessing = true;
mock.module("@rawkoon/api/db", () => ({
  prisma: {
    mediaSettings: {
      findUnique: async () => ({ postProcessingEnabled: postProcessing }),
    },
    downloadHistory: {
      findMany: async (a: { where: Record<string, unknown> }) => {
        lastWhere = a.where;
        return rows;
      },
    },
  },
}));
const { activeShowGrabCover } = await import(
  "@rawkoon/api/services/activeShowGrab"
);
afterAll(() => {
  mock.module("@rawkoon/api/db", () => realDb);
});

describe("activeShowGrabCover", () => {
  it("keeps a completed row in force until its import reports", async () => {
    rows = [];
    await activeShowGrabCover(1);
    const clauses = lastWhere.OR as Array<Record<string, unknown>>;
    expect(lastWhere).toMatchObject({
      episodeId: null,
      season: null,
      failed: false,
    });
    expect(clauses[0]).toEqual({ completedAt: null });
    // Completed, but no destination, skip reason or error yet: still importing.
    expect(clauses[1]).toMatchObject({
      postProcessDestinationPath: null,
      postProcessSkipReason: null,
      postProcessError: null,
    });
    expect(clauses[1]?.completedAt).toHaveProperty("gte");
  });

  it("is null without a row, whole-show for a label, ranged for a span", async () => {
    rows = [];
    expect(await activeShowGrabCover(1)).toBeNull();

    rows = [{ mediaId: 1, releaseTitle: "Show.Integrale.MULTi.1080p" }];
    expect((await activeShowGrabCover(1))?.(9)).toBe(true);

    rows = [{ mediaId: 1, releaseTitle: "Show.S01-S03.COMPLETE.1080p" }];
    const cover = await activeShowGrabCover(1);
    expect([cover?.(1), cover?.(3), cover?.(5)]).toEqual([true, true, false]);
  });

  it("has no import grace when post-processing is disabled", async () => {
    postProcessing = false;
    rows = [];
    await activeShowGrabCover(1);
    expect(lastWhere.OR).toEqual([{ completedAt: null }]);
    postProcessing = true;
  });
});
