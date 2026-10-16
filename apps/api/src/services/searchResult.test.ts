import { beforeEach, describe, expect, it, mock } from "bun:test";

const updateMedia = mock(async (_args: unknown) => ({}));

mock.module("@rawkoon/api/db", () => ({
  prisma: { libraryMedia: { update: updateMedia } },
}));

const { libraryEventBus } = await import("@rawkoon/api/services/libraryEvents");
const { notReleasedResult, publishSearchResult, searchResultFrom } =
  await import("./searchResult");

describe("searchResultFrom", () => {
  it("reports the grabbed release's quality", () => {
    expect(
      searchResultFrom(
        7,
        {
          grabbed: true,
          releaseTitle: "Some.Movie.2024.1080p.WEB-DL",
          release: {
            title: "Some.Movie.2024.1080p.WEB-DL",
            resolution: 1080,
            source: "WEB-DL",
            sizeBytes: 7_800_000_000,
          },
        },
        undefined,
      ),
    ).toEqual({
      media_id: 7,
      outcome: "grabbed",
      release: {
        title: "Some.Movie.2024.1080p.WEB-DL",
        resolution: 1080,
        source: "WEB-DL",
        size_bytes: 7_800_000_000,
      },
    });
  });

  it("falls back to the release title when the grab carries no details", () => {
    const r = searchResultFrom(7, { grabbed: true, releaseTitle: "X" });
    expect(r.release).toEqual({
      title: "X",
      resolution: null,
      source: null,
      size_bytes: null,
    });
  });

  it("reports a held grab with its release time and the season", () => {
    const until = new Date("2026-10-16T18:30:00.000Z");
    expect(
      searchResultFrom(
        7,
        {
          grabbed: false,
          delayed: true,
          delayUntil: until,
          reason: "Held by grab delay",
        },
        2,
      ),
    ).toEqual({
      media_id: 7,
      season: 2,
      outcome: "delayed",
      delay_until: until.toISOString(),
    });
  });

  it("treats an empty search and a language fallback as a miss, anything else as an error", () => {
    expect(
      searchResultFrom(7, {
        grabbed: false,
        reason: "No matching releases found",
      }).outcome,
    ).toBe("no_match");
    const summary = { missing: ["VFQ"], counts: { VFF: 2 } };
    const fallback = searchResultFrom(7, {
      grabbed: false,
      reason: "No VFQ release yet",
      languageFallback: summary,
    });
    expect(fallback.outcome).toBe("no_match");
    expect(fallback.language_fallback_summary).toEqual(summary);
    expect(
      searchResultFrom(7, {
        grabbed: false,
        reason: "No indexer manager configured",
      }).outcome,
    ).toBe("error");
  });

  it("carries the digital release date for a title that is not out yet", () => {
    const day = new Date("2026-12-01T00:00:00.000Z");
    expect(notReleasedResult(7, day)).toEqual({
      media_id: 7,
      outcome: "not_released",
      delay_until: day.toISOString(),
    });
    expect(notReleasedResult(7, null).delay_until).toBeUndefined();
  });
});

describe("publishSearchResult", () => {
  beforeEach(() => updateMedia.mockClear());

  it("stores the outcome and pushes it on the library bus", async () => {
    const seen: unknown[] = [];
    const listener = (e: unknown) => seen.push(e);
    libraryEventBus.on("search-result", listener);
    await publishSearchResult({
      media_id: 7,
      outcome: "no_match",
      reason: "No matching releases found",
    });
    libraryEventBus.off("search-result", listener);

    const args = updateMedia.mock.calls[0]?.[0] as {
      where: { id: number };
      data: Record<string, unknown>;
    };
    expect(args.where.id).toBe(7);
    expect(args.data.lastSearchOutcome).toBe("no_match");
    expect(args.data.lastSearchReason).toBe("No matching releases found");
    expect(args.data.lastSearchAt).toBeInstanceOf(Date);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ media_id: 7, outcome: "no_match" });
  });

  it("clears the stored reason on a grab and skips storage when asked", async () => {
    await publishSearchResult({ media_id: 7, outcome: "grabbed" });
    const args = updateMedia.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(args.data.lastSearchReason).toBeNull();

    updateMedia.mockClear();
    await publishSearchResult(
      { media_id: 7, outcome: "no_match" },
      { persist: false },
    );
    expect(updateMedia).not.toHaveBeenCalled();
  });

  it("still pushes the event when the write fails", async () => {
    updateMedia.mockImplementationOnce(async () => {
      throw new Error("gone");
    });
    const seen: unknown[] = [];
    const listener = (e: unknown) => seen.push(e);
    libraryEventBus.on("search-result", listener);
    await publishSearchResult({ media_id: 7, outcome: "error", reason: "x" });
    libraryEventBus.off("search-result", listener);
    expect(seen).toHaveLength(1);
  });
});
