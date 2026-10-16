import { describe, expect, it } from "bun:test";
import { matchableRssRelease } from "@rawkoon/api/workers/pollIndexerRss";

describe("RSS matching of multi-season packs", () => {
  it.each([
    "Quiet.Harbor.S01-S03.1080p.WEB.h264-GRP",
    "Quiet Harbor Seasons 1-3 1080p WEB-DL",
    "Quiet.Harbor.S01.S02.1080p.WEB-DL",
  ])("ignores %s", (title) => {
    expect(matchableRssRelease(title)).toBeNull();
  });

  it("still matches a single-season pack", () => {
    expect(
      matchableRssRelease("Quiet.Harbor.S02.1080p.WEB.h264-GRP"),
    ).toMatchObject({
      normalizedTitle: "quiet harbor",
      season: 2,
      episode: null,
    });
  });

  it.each([
    "Quiet.Harbor.S01E01.1080p.WEB.h264-GRP",
    "Quiet.Harbor.S01E01-E03.1080p.WEB.h264-GRP",
  ])("still matches episode release %s", (title) => {
    expect(matchableRssRelease(title)).toMatchObject({
      season: 1,
      episode: 1,
    });
  });
});
