import { describe, expect, test } from "bun:test";
import type { LandedArrival } from "../../types/library";
import {
  freshLanded,
  insertLanded,
  landedEpisodeCode,
} from "../landedArrivals";

// Same table as RawkoonKit's LandedArrivalsTests; change both together.
const MIN = 60_000;
const NOW = 1_000_000_000_000;

function arrival(mediaId: number, ts: number): LandedArrival {
  return {
    mediaId,
    mediaType: "movie",
    title: `Title ${mediaId}`,
    posterUrl: null,
    season: null,
    episode: null,
    episodeCount: null,
    ts,
  };
}

describe("insertLanded", () => {
  test("puts the newest first", () => {
    const list = insertLanded([arrival(1, NOW - MIN)], arrival(2, NOW), NOW);
    expect(list.map((a) => a.mediaId)).toEqual([2, 1]);
  });

  test("replaces an older arrival of the same media", () => {
    const list = insertLanded(
      [arrival(1, NOW - 2 * MIN), arrival(2, NOW - MIN)],
      arrival(1, NOW),
      NOW,
    );
    expect(list.map((a) => a.mediaId)).toEqual([1, 2]);
    expect(list[0]?.ts).toBe(NOW);
  });

  test("drops entries older than 30 minutes", () => {
    const list = insertLanded(
      [arrival(1, NOW - 31 * MIN), arrival(2, NOW - 29 * MIN)],
      arrival(3, NOW),
      NOW,
    );
    expect(list.map((a) => a.mediaId)).toEqual([3, 2]);
  });

  test("caps the list at 10", () => {
    let list: LandedArrival[] = [];
    for (let i = 1; i <= 12; i++)
      list = insertLanded(list, arrival(i, NOW), NOW);
    expect(list).toHaveLength(10);
    expect(list[0]?.mediaId).toBe(12);
  });
});

describe("freshLanded", () => {
  test("keeps only non-expired entries", () => {
    const list = freshLanded(
      [arrival(1, NOW - 30 * MIN), arrival(2, NOW - 30 * MIN + 1)],
      NOW,
    );
    expect(list.map((a) => a.mediaId)).toEqual([2]);
  });
});

describe("landedEpisodeCode", () => {
  test.each([
    [1, 4, "S01E04"],
    [12, 10, "S12E10"],
    [2, null, "S02"],
    [null, null, ""],
  ] as const)("season %p episode %p is %p", (season, episode, code) => {
    expect(landedEpisodeCode(season, episode)).toBe(code);
  });
});
