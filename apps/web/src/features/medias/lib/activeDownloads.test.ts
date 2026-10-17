import { describe, expect, it } from "vitest";
import type {
  DashboardPipeline,
  ActiveDownloadItem,
  ActiveDownloadsResponse,
} from "@rawkoon/shared/types";
import {
  downloadProgressForMedia,
  etaForMedia,
  mergeActiveProgress,
  mergePipelineProgress,
  mergeSummaryProgress,
} from "./activeDownloads";

describe("etaForMedia", () => {
  it("takes the longest ETA among the title's grabs and ignores other titles", () => {
    const data = response([
      item({ id: 1, media_id: 10, eta_seconds: 60 }),
      item({ id: 2, media_id: 10, eta_seconds: 300 }),
      item({ id: 3, media_id: 11, eta_seconds: 9999 }),
    ]);
    expect(etaForMedia(data, 10)).toBe(300);
  });

  it("is null without an ETA or without a list", () => {
    expect(etaForMedia(response([item({ eta_seconds: null })]), 10)).toBeNull();
    expect(etaForMedia(undefined, 10)).toBeNull();
  });
});

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

const summary = (...progress: number[]) => ({
  items: progress.map((p, i) => ({
    id: i + 1,
    media_id: 10,
    episode_id: null,
    progress: p,
  })),
});

describe("mergeSummaryProgress", () => {
  it("patches progress by id and keeps the rest", () => {
    const next = mergeSummaryProgress(summary(0.1, 0.2), [
      {
        id: 2,
        progress: 0.7,
        state: "downloading",
        downloadSpeed: 1,
        etaSeconds: 1,
      },
    ]);
    expect(next?.items.map((i) => i.progress)).toEqual([0.1, 0.7]);
    expect(mergeSummaryProgress(undefined, [])).toBeUndefined();
  });
});

describe("downloadProgressForMedia", () => {
  it("averages a title's grabs, floors, and counts how many are in flight", () => {
    const data = {
      items: [
        ...summary(0.25, 0.5).items,
        { id: 9, media_id: 99, episode_id: null, progress: 1 },
      ],
    };
    expect(downloadProgressForMedia(data, 10)).toEqual({
      percent: 37,
      count: 2,
    });
  });

  it("never reports 100 while a grab is still active", () => {
    expect(downloadProgressForMedia(summary(0.9996), 10)?.percent).toBe(99);
  });

  it("is null when the title has no active grab", () => {
    expect(downloadProgressForMedia(summary(0.5), 5)).toBeNull();
    expect(downloadProgressForMedia(undefined, 10)).toBeNull();
  });
});

describe("mergePipelineProgress", () => {
  const base = {
    downloading: {
      available: true,
      count: 2,
      speed_bytes_per_sec: 10,
      items: [
        {
          id: 1,
          library_media_id: 1,
          book_id: null,
          title: "A",
          progress: 0.1,
          eta_seconds: 90,
        },
        {
          id: 2,
          library_media_id: 2,
          book_id: null,
          title: "B",
          progress: 0.5,
          eta_seconds: 30,
        },
      ],
    },
  } as unknown as DashboardPipeline;

  it("patches progress and ETA by id and leaves the rest", () => {
    const next = mergePipelineProgress(base, [
      {
        id: 2,
        progress: 0.8,
        state: "downloading",
        downloadSpeed: 1,
        etaSeconds: 12,
      },
    ]);
    expect(next?.downloading.items[0].progress).toBe(0.1);
    expect(next?.downloading.items[1]).toMatchObject({
      progress: 0.8,
      eta_seconds: 12,
    });
    expect(next?.downloading.speed_bytes_per_sec).toBe(10);
  });

  it("returns the cache untouched with no data or no events", () => {
    expect(mergePipelineProgress(undefined, [])).toBeUndefined();
    expect(mergePipelineProgress(base, [])).toBe(base);
  });
});
