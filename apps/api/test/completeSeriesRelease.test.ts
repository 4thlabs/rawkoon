import { describe, expect, it } from "bun:test";
import { releaseCoversSeasons } from "@rawkoon/api/utils/medias/completeSeries";

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
  ])("rejects %s for seasons 1-3", (title) => {
    expect(releaseCoversSeasons(title, [1, 2, 3])).toBe(false);
  });

  it("checks only the wanted seasons against a range", () => {
    expect(releaseCoversSeasons("Show.S02-S04.1080p", [2, 4])).toBe(true);
    expect(releaseCoversSeasons("Show.S02-S04.1080p", [1, 2])).toBe(false);
  });
});
