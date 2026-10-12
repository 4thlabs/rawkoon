import { describe, expect, it } from "bun:test";
import { parseSeasonEpisode } from "./postProcessorHelpers";

describe("parseSeasonEpisode", () => {
  it.each([
    ["Show.S02E05.1080p.mkv", { season: 2, episode: 5 }],
    ["Show.1x05.720p.mkv", { season: 1, episode: 5 }],
    [
      "[SubsPlease] Show - 05 (1080p) [ABCD1234].mkv",
      { season: null, episode: 5 },
    ],
    ["[Grp] Show - 13v2 [1080p].mkv", { season: null, episode: 13 }],
    ["Show - 1001.mkv", { season: null, episode: 1001 }],
    ["Show E05.mkv", { season: null, episode: 5 }],
    ["Show.Ep.12.mkv", { season: null, episode: 12 }],
    ["Extras.S01E02.720p.mkv", { season: 1, episode: 2 }],
  ])("%s", (name, expected) => {
    expect(parseSeasonEpisode(name)).toEqual(expected);
  });

  it.each([
    "Show 2019 1080p.mkv",
    "Show - 2019 [1080p].mkv",
    "Show 1920x1080 x265.mkv",
    "Show.DDP5.1.E-AC3.mkv",
    "Show.S01E01.sample.mkv",
    "Show - 01 sample.mkv",
    "Extras - 01.mkv",
    "[Grp] Show - NCOP 01 [1080p].mkv",
  ])("rejects %s", (name) => {
    expect(parseSeasonEpisode(name)).toBeNull();
  });
});
