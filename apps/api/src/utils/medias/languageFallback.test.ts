import { describe, expect, it } from "bun:test";
import {
  buildLanguageFallbackSummary,
  classifyLanguageFallback,
  languageFallbackReason,
} from "@rawkoon/api/utils/medias/languageFallback";
import { scoreReleaseDetailed } from "@rawkoon/api/utils/medias/releaseScorer";
import { parseReleaseTitle } from "@rawkoon/api/utils/medias/filenameParser";
import type { QualityProfileScoreInput } from "@rawkoon/api/utils/medias/releaseScorer";

const QC = ["VFQ", "VF2", "VFI"];
const LANG_ONLY = ["language_no_match"];

describe("classifyLanguageFallback", () => {
  it("tags French releases rejected only for language", () => {
    expect(
      classifyLanguageFallback("Film.2020.MULTi.VFF.1080p-GRP", LANG_ONLY, QC),
    ).toBe("VFF");
    expect(
      classifyLanguageFallback("Film.2020.TRUEFRENCH.1080p-GRP", LANG_ONLY, QC),
    ).toBe("VFF");
    expect(
      classifyLanguageFallback("Film.2020.MULTi.1080p-GRP", LANG_ONLY, QC),
    ).toBe("MULTi");
    expect(
      classifyLanguageFallback("Film.2020.FRENCH.1080p-GRP", LANG_ONLY, QC),
    ).toBe("FRENCH");
  });

  it("ignores releases with another rejection reason", () => {
    expect(
      classifyLanguageFallback(
        "Film.2020.MULTi.VFF.1080p-GRP",
        ["language_no_match", "size_over_cap"],
        QC,
      ),
    ).toBeNull();
    expect(
      classifyLanguageFallback("Film.2020.MULTi.VFF.1080p-GRP", [], QC),
    ).toBeNull();
  });

  it("ignores releases outside the preferred language family", () => {
    expect(
      classifyLanguageFallback("Film.2020.1080p-GRP", LANG_ONLY, QC),
    ).toBeNull();
    expect(
      classifyLanguageFallback("Film.2020.GERMAN.1080p-GRP", LANG_ONLY, QC),
    ).toBeNull();
    expect(
      classifyLanguageFallback("Film.2020.GERMAN.1080p-GRP", LANG_ONLY, ["de"]),
    ).toBe("DE");
  });
});

describe("scoring keeps a fallback release rejected", () => {
  const profile: QualityProfileScoreInput = {
    minResolution: 720,
    cutoffResolution: null,
    preferredSources: [],
    preferredCodecs: [],
    preferredLanguages: QC,
    prioritizedTrackers: [],
    preferTrackerOverQuality: false,
    maxSizeGb: null,
    requireHdr: false,
    preferHdr: false,
    minSeeders: 0,
    customFormats: [],
  };

  it("rejects VFF under a VFQ profile but accepts it when VFF is preferred", () => {
    const title = "Film.2020.MULTi.VFF.1080p.WEB.H264-GRP";
    const ctx = {
      parsed: parseReleaseTitle(title),
      rawTitle: title,
      sizeBytes: 1e9,
      indexerName: null,
      seeders: 5,
      freeleech: false,
    };
    const rejected = scoreReleaseDetailed(ctx, profile);
    expect(rejected.rejected).toBe(true);
    expect(rejected.rejected && rejected.reasons.map((r) => r.code)).toEqual(
      LANG_ONLY,
    );
    expect(
      scoreReleaseDetailed(ctx, { ...profile, preferredLanguages: ["VFF"] })
        .rejected,
    ).toBe(false);
    expect(
      scoreReleaseDetailed(
        { ...ctx, rawTitle: "Film.2020.TRUEFRENCH.1080p.WEB.H264-GRP" },
        { ...profile, preferredLanguages: ["VFF"] },
      ).rejected,
    ).toBe(false);
  });
});

describe("buildLanguageFallbackSummary", () => {
  it("counts per display tag and carries the preferred languages", () => {
    expect(
      buildLanguageFallbackSummary(QC, ["VFF", "VFF", "VFI", "MULTi"]),
    ).toEqual({ missing: QC, counts: { VFF: 2, VFI: 1, MULTi: 1 } });
  });

  it("is null without fallback releases", () => {
    expect(buildLanguageFallbackSummary(QC, [])).toBeNull();
  });
});

describe("languageFallbackReason", () => {
  it("names the missing languages and the other versions found", () => {
    const summary = buildLanguageFallbackSummary(
      ["VFQ", "VF2"],
      ["VFF", "VFF", "VFF", "VFF", "VFI", "VFI"],
    )!;
    expect(languageFallbackReason(summary)).toBe(
      "No VFQ or VF2 release yet; 6 in other French versions (VFF 4, VFI 2)",
    );
  });

  it("falls back to a generic wording for other languages", () => {
    const summary = buildLanguageFallbackSummary(["de"], ["DE", "DE"])!;
    expect(languageFallbackReason(summary)).toBe(
      "No de release yet; 2 in other languages (DE 2)",
    );
  });
});
