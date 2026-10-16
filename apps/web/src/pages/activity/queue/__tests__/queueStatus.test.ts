import { describe, expect, it } from "vitest";
import type {
  ActiveDownloadItem,
  PendingReleaseItem,
} from "@rawkoon/shared/types";
import {
  buildQueueRows,
  countByStatus,
  statusForDownload,
} from "../queueStatus";

const download = (over: Partial<ActiveDownloadItem>): ActiveDownloadItem => ({
  id: 1,
  media_id: 10,
  media_title: "Title",
  media_type: "movie",
  poster_url: null,
  season: null,
  episode: null,
  release_title: "Title.1080p",
  progress: 0.4,
  state: "downloading",
  download_speed: 1000,
  eta_seconds: 60,
  ...over,
});

const held = (over: Partial<PendingReleaseItem>): PendingReleaseItem => ({
  target_key: "k1",
  media_id: 11,
  media_title: "Held",
  poster_url: null,
  season: 1,
  episode: 2,
  release_title: "Held.S01E02",
  candidate_count: 3,
  grab_after: new Date(1_000_000 + 600_000).toISOString(),
  ...over,
});

describe("statusForDownload", () => {
  it("maps client states onto the five plain statuses", () => {
    expect(statusForDownload(download({ state: "downloading" }))).toBe(
      "downloading",
    );
    expect(statusForDownload(download({ state: "stalled" }))).toBe("stalled");
    expect(statusForDownload(download({ state: "error" }))).toBe("failed");
    expect(statusForDownload(download({ state: "paused" }))).toBe("waiting");
    expect(
      statusForDownload(download({ state: "completed", progress: 1 })),
    ).toBe("importing");
    expect(
      statusForDownload(download({ state: "downloading", progress: 1 })),
    ).toBe("importing");
  });
});

describe("buildQueueRows", () => {
  it("gives every row one status and a reason, held grabs included", () => {
    const rows = buildQueueRows(
      [download({}), download({ id: 2, state: "error" })],
      [held({})],
      1_000_000,
    );
    expect(rows.map((r) => r.status)).toEqual([
      "downloading",
      "failed",
      "waiting",
    ]);
    expect(rows[0].reason).toEqual({
      kind: "transfer",
      speed: 1000,
      etaSeconds: 60,
    });
    expect(rows[1].reason).toEqual({ kind: "failed" });
    expect(rows[2].reason).toEqual({
      kind: "grabIn",
      seconds: 600,
      candidates: 3,
    });
    expect(rows[2].targetKey).toBe("k1");
  });

  it("reports a held grab whose delay has passed as due", () => {
    const [row] = buildQueueRows([], [held({})], 5_000_000);
    expect(row.reason).toEqual({ kind: "grabDue", candidates: 3 });
  });

  it("counts rows per status", () => {
    const rows = buildQueueRows(
      [download({}), download({ id: 2, state: "stalled" })],
      [held({})],
      0,
    );
    expect(countByStatus(rows)).toEqual({
      all: 3,
      downloading: 1,
      waiting: 1,
      importing: 0,
      stalled: 1,
      failed: 0,
    });
  });
});
