import { describe, expect, it } from "bun:test";
import {
  isMultiSeasonRelease,
  releaseCoversSeasons,
  singleSeasonNamed,
} from "@rawkoon/api/utils/medias/completeSeries";

describe("releaseCoversSeasons", () => {
  it.each([
    "Show.Name.Integrale.MULTi.1080p.WEB",
    "Show.Name.Complete.Series.1080p.WEB-DL",
    "Show.Name.S01-S03.COMPLETE.1080p.WEB",
    "Show Name Seasons 1-4 1080p",
  ])("accepts %s for seasons 1-3", (title) => {
    expect(releaseCoversSeasons(title, [1, 2, 3])).toBe(true);
  });

  it.each([
    "Show.Name.S01-S02.1080p.WEB",
    "Show Name Seasons 2-4 1080p",
    "Show.Name.S01.1080p.WEB-DL",
    "Show.Name.S01E01.1080p.WEB-DL",
    "Show.Name.S01E01-E10.1080p.WEB-DL",
    "Show.Name.2020.1080p.WEB-DL",
    "Show.Integrale.Saison.2.FRENCH.1080p",
    "Show.Saison.1.Integrale.FRENCH.1080p",
    "Show.Integrale.S01.FRENCH.1080p",
    "Show.Complete.Series.S01.1080p",
  ])("rejects %s for seasons 1-3", (title) => {
    expect(releaseCoversSeasons(title, [1, 2, 3])).toBe(false);
  });

  it("checks only the wanted seasons against a range", () => {
    expect(releaseCoversSeasons("Show.S02-S04.1080p", [2, 4])).toBe(true);
    expect(releaseCoversSeasons("Show.S02-S04.1080p", [1, 2])).toBe(false);
  });
});

describe("singleSeasonNamed", () => {
  it.each([
    ["Show.Integrale.Saison.2.FRENCH", 2],
    ["Show.Saison.1.Integrale.FRENCH", 1],
    ["Show.Integrale.S01.FRENCH.1080p", 1],
    ["Show.Complete.Series.1080p", null],
    ["Show.Integrale.MULTi.1080p", null],
  ])("%s -> %s", (title, season) => {
    expect(singleSeasonNamed(title)).toBe(season);
  });
});

describe("isMultiSeasonRelease", () => {
  it("is true for ranges and unranged series labels, false for one season", () => {
    expect(isMultiSeasonRelease("Show.S01-S03.1080p")).toBe(true);
    expect(isMultiSeasonRelease("Show.Integrale.MULTi.1080p")).toBe(true);
    expect(isMultiSeasonRelease("Show.Integrale.Saison.2.1080p")).toBe(false);
    expect(isMultiSeasonRelease("Show.S02.1080p")).toBe(false);
  });
});
