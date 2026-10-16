import { describe, expect, it } from "vitest";
import type { InteractiveReleaseItem } from "@rawkoon/shared/types";
import { bestMatchReasons, pickBestMatch } from "./bestMatch";

function release(
  title: string,
  extra: Partial<InteractiveReleaseItem> = {},
): InteractiveReleaseItem {
  return {
    guid: title,
    title,
    indexer: "idx",
    indexer_id: 1,
    languages: [],
    protocol: "torrent",
    size_bytes: 8e9,
    age: 1,
    seeders: 12,
    leechers: 1,
    rejected: false,
    rejection_reason: null,
    info_url: null,
    source: "jackett",
    quality_score: 1000,
    ...extra,
  };
}

describe("pickBestMatch", () => {
  it("takes the top score among releases the profile may grab", () => {
    const best = pickBestMatch([
      release("low", { quality_score: 100 }),
      release("rejected", { quality_score: 9000, rejected: true }),
      release("fallback", { quality_score: 8000, language_fallback: true }),
      release("top", { quality_score: 2500 }),
    ]);
    expect(best?.title).toBe("top");
  });

  it("breaks a tie on title, like the search route", () => {
    const best = pickBestMatch([
      release("b release", { quality_score: 500 }),
      release("a release", { quality_score: 500 }),
    ]);
    expect(best?.title).toBe("a release");
  });

  it("is null without a profile score or without a candidate", () => {
    expect(
      pickBestMatch([release("unscored", { quality_score: null })]),
    ).toBeNull();
    expect(pickBestMatch([release("x", { rejected: true })])).toBeNull();
    expect(pickBestMatch([])).toBeNull();
  });
});

describe("bestMatchReasons", () => {
  it("lists quality, language, tracker, then seeders, capped at four", () => {
    const reasons = bestMatchReasons(
      release("r", {
        languages: ["VFQ"],
        parsed_quality: {
          resolution: 1080,
          source: "BluRay",
          codec: null,
          hdr: null,
        },
        score_breakdown: {
          rejected: false,
          total: 1,
          matched_formats: [],
          components: [
            { code: "language_match", value: 300 },
            { code: "tracker_priority", value: 100 },
          ],
        },
      }),
    );
    expect(reasons.map((r) => r.key)).toEqual([
      "quality",
      "language",
      "tracker",
      "seeders",
    ]);
    expect(reasons[0]).toEqual({ key: "quality", quality: "1080p BluRay" });
  });

  it("skips signals the release does not have", () => {
    const reasons = bestMatchReasons(
      release("r", { seeders: 0, size_bytes: null, parsed_quality: null }),
    );
    expect(reasons).toEqual([]);
  });
});
