import { describe, it, expect } from "bun:test";
import {
  isFrenchFallbackTag,
  languageFallbackTag,
  languageFamilyOf,
} from "../languageFamily";

const QC = ["VFQ", "VF2", "VFI"];

describe("languageFamilyOf", () => {
  it("maps every French variant to fr", () => {
    for (const f of ["VFF", "vfq", "VFI", "VF2", "TRUEFRENCH", "VF", "FRENCH"])
      expect(languageFamilyOf(f)).toBe("fr");
    expect(languageFamilyOf("fr")).toBe("fr");
  });

  it("keeps two-letter codes and ignores non-audio flags", () => {
    expect(languageFamilyOf("de")).toBe("de");
    expect(languageFamilyOf("MULTI")).toBeNull();
    expect(languageFamilyOf("VOSTFR")).toBeNull();
  });
});

describe("languageFallbackTag", () => {
  it("returns the specific French variant", () => {
    expect(languageFallbackTag(["MULTI", "VFF"], QC)).toBe("VFF");
    expect(languageFallbackTag(["TRUEFRENCH", "VFF"], QC)).toBe("VFF");
    expect(languageFallbackTag(["TRUEFRENCH"], QC)).toBe("VFF");
    expect(languageFallbackTag(["FRENCH", "fr"], ["VFQ"])).toBe("FRENCH");
  });

  it("labels a bare MULTi by its generic French audio", () => {
    expect(languageFallbackTag(["MULTI", "fr"], QC)).toBe("MULTi");
  });

  it("is null when no flag shares a family with the preferences", () => {
    expect(languageFallbackTag([], QC)).toBeNull();
    expect(languageFallbackTag(["MULTI"], QC)).toBeNull();
    expect(languageFallbackTag(["en"], QC)).toBeNull();
    expect(languageFallbackTag(["VOSTFR"], QC)).toBeNull();
  });

  it("handles non-French families by ISO code", () => {
    expect(languageFallbackTag(["de"], ["de"])).toBe("DE");
    expect(languageFallbackTag(["de"], ["es"])).toBeNull();
  });
});

describe("isFrenchFallbackTag", () => {
  it("separates French tags from other languages", () => {
    expect(isFrenchFallbackTag("MULTi")).toBe(true);
    expect(isFrenchFallbackTag("VFF")).toBe(true);
    expect(isFrenchFallbackTag("DE")).toBe(false);
  });
});
