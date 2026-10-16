import { describe, expect, it } from "vitest";
import type {
  ActiveDownloadItem,
  ActiveDownloadsResponse,
} from "@rawkoon/shared/types";
import {
  downloadPercentForMedia,
  mergeActiveProgress,
} from "./activeDownloads";

function item(over: Partial<ActiveDownloadItem>): ActiveDownloadItem {
  return {
    id: 1,
    media_id: 10,
    media_title: "Title",
    media_type: "movie",
    poster_url: null,
    season: null,
    episode: null,
    release_title: "release",
    progress: 0.2,
    state: "downloading",
    download_speed: 100,
    eta_seconds: 60,
    ...over,
  };
}

const response = (items: ActiveDownloadItem[]): ActiveDownloadsResponse => ({
  enabled: true,
  connected: true,
  items,
});

describe("mergeActiveProgress", () => {
  it("patches matching rows, maps camelCase to snake_case, and leaves the rest", () => {
    const current = response([item({ id: 1 }), item({ id: 2, progress: 0.9 })]);
    const next = mergeActiveProgress(current, [
      {
        id: 1,
        progress: 0.5,
        state: "stalled",
        downloadSpeed: 7,
        etaSeconds: null,
      },
    ]);
    expect(next).not.toBe(current);
    expect(next?.items[0]).toMatchObject({
      progress: 0.5,
      state: "stalled",
      download_speed: 7,
      eta_seconds: null,
    });
    expect(next?.items[1]).toBe(current.items[1]);
    expect(current.items[0]!.progress).toBe(0.2);
  });

  it("passes through an empty cache or an empty push", () => {
    expect(mergeActiveProgress(undefined, [])).toBeUndefined();
    const current = response([item({})]);
    expect(mergeActiveProgress(current, [])).toBe(current);
  });
});

describe("downloadPercentForMedia", () => {
  it("averages a title's grabs and floors the result", () => {
    const data = response([
      item({ id: 1, progress: 0.25 }),
      item({ id: 2, progress: 0.5 }),
      item({ id: 3, media_id: 99, progress: 1 }),
    ]);
    expect(downloadPercentForMedia(data, 10)).toBe(37);
  });

  it("never reports 100 while a grab is still active", () => {
    expect(
      downloadPercentForMedia(response([item({ progress: 0.9996 })]), 10),
    ).toBe(99);
  });

  it("is null when the title has no active grab", () => {
    expect(downloadPercentForMedia(response([item({})]), 5)).toBeNull();
    expect(downloadPercentForMedia(undefined, 10)).toBeNull();
  });
});
