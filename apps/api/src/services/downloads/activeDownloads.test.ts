import { describe, expect, it } from "bun:test";
import {
  buildActiveDownloads,
  buildProgressSummary,
  type ActiveGrabRow,
} from "@rawkoon/api/services/downloads/activeDownloads";
import type { NormalizedTorrent } from "@rawkoon/api/services/downloadClient/types";

function torrent(over: Partial<NormalizedTorrent>): NormalizedTorrent {
  return {
    hash: "abc",
    name: "release",
    state: "downloading",
    progress: 0.5,
    savePath: "/dl",
    contentPath: null,
    seeds: 1,
    peers: 1,
    dlSpeed: 100,
    upSpeed: 0,
    seedingTimeSecs: null,
    category: null,
    sizeBytes: 1000,
    labels: [],
    ratio: null,
    ...over,
  };
}

function row(over: Partial<ActiveGrabRow>): ActiveGrabRow {
  return {
    id: 1,
    releaseTitle: "Some.Movie.2020.1080p",
    torrentHash: "ABC",
    season: null,
    episodeId: null,
    media: { id: 7, title: "Some Movie", type: "movie", posterUrl: "/p.jpg" },
    episode: null,
    ...over,
  };
}

describe("buildActiveDownloads", () => {
  it("joins a grab to its torrent case-insensitively and derives the ETA", () => {
    const [item] = buildActiveDownloads([row({})], [torrent({})]);
    expect(item).toEqual({
      id: 1,
      media_id: 7,
      media_title: "Some Movie",
      media_type: "movie",
      poster_url: "/p.jpg",
      season: null,
      episode: null,
      release_title: "Some.Movie.2020.1080p",
      progress: 0.5,
      state: "downloading",
      download_speed: 100,
      eta_seconds: 5,
    });
  });

  it("carries the episode numbers, falling back to the pack season", () => {
    const show = { id: 2, title: "Show", type: "show", posterUrl: null };
    const items = buildActiveDownloads(
      [
        row({
          id: 1,
          torrentHash: "a",
          media: show,
          episode: { season: 2, episode: 5 },
        }),
        row({ id: 2, torrentHash: "b", season: 3, media: show }),
      ],
      [torrent({ hash: "a" }), torrent({ hash: "b" })],
    );
    expect(items.map((i) => [i.media_type, i.season, i.episode])).toEqual([
      ["show", 2, 5],
      ["show", 3, null],
    ]);
  });

  it("skips grabs the client does not report and rows without a title", () => {
    expect(
      buildActiveDownloads(
        [row({ torrentHash: "zzz" }), row({ id: 2, media: null })],
        [torrent({})],
      ),
    ).toEqual([]);
  });
});

describe("buildProgressSummary", () => {
  it("exposes only ids and progress", () => {
    expect(
      buildProgressSummary([row({ episodeId: 3 })], [torrent({})]),
    ).toEqual([{ id: 1, media_id: 7, episode_id: 3, progress: 0.5 }]);
  });
});
