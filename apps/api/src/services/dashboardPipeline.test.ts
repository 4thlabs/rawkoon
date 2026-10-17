import { describe, expect, it, spyOn } from "bun:test";
import {
  buildDashboardPipeline,
  type PipelineSources,
} from "@rawkoon/api/services/dashboardPipeline";

const torrent = (hash: string, progress: number, dlSpeed: number) =>
  ({ hash, progress, dlSpeed, state: "downloading" }) as never;

function sources(over: Partial<PipelineSources> = {}): PipelineSources {
  return {
    listTorrents: async () => [torrent("aa", 0.5, 100), torrent("bb", 0.2, 50)],
    loadMediaRows: async () =>
      [
        { id: 1, torrentHash: "AA", media: { id: 7, title: "Movie" } },
        { id: 3, torrentHash: "missing", media: { id: 8, title: "Gone" } },
      ] as never,
    loadBookRows: async () =>
      [
        {
          id: 2,
          torrentHash: "bb",
          bookEdition: { book: { id: 9, title: "Book" } },
        },
      ] as never,
    countDelayedTargets: async () => 2,
    countOpenAlerts: async () => 2,
    openAlertMediaIds: async () => [7, 8],
    countWantedMisses: async () => 3,
    lastRssRun: async () =>
      ({
        status: "success",
        completed_at: "2026-01-01T00:00:00.000Z",
        releases_found: 12,
      }) as never,
    nextRssRunAt: async () => "2026-01-01T00:15:00.000Z",
    countReencode: async () => ({ running: 1, queued: 4 }),
    ...over,
  };
}

describe("buildDashboardPipeline", () => {
  it("joins media and book grabs and sums speed", async () => {
    const r = await buildDashboardPipeline(sources());
    expect(r.downloading.available).toBe(true);
    expect(r.downloading.count).toBe(2);
    expect(r.downloading.speed_bytes_per_sec).toBe(150);
    expect(
      r.downloading.items.map((i) => [i.id, i.library_media_id, i.book_id]),
    ).toEqual([
      [1, 7, null],
      [2, null, 9],
    ]);
    expect(r.delayed).toEqual({ available: true, count: 2 });
    expect(r.attention).toEqual({
      available: true,
      count: 5,
      alerts: 2,
      gave_up: 3,
    });
    expect(r.rss).toEqual({
      available: true,
      last_run_at: "2026-01-01T00:00:00.000Z",
      ok: true,
      releases_found: 12,
      next_run_at: "2026-01-01T00:15:00.000Z",
    });
    expect(r.reencode).toEqual({ available: true, active: 1, queued: 4 });
  });

  it("caps the items at three", async () => {
    const rows = [1, 2, 3, 4].map((id) => ({
      id,
      torrentHash: "aa",
      media: { id, title: "T" },
    }));
    const r = await buildDashboardPipeline(
      sources({
        loadMediaRows: async () => rows as never,
        loadBookRows: async () => [],
      }),
    );
    expect(r.downloading.count).toBe(4);
    expect(r.downloading.items).toHaveLength(3);
  });

  it("zeroes only the block whose source fails", async () => {
    const err = spyOn(console, "error").mockImplementation(() => {});
    const r = await buildDashboardPipeline(
      sources({
        listTorrents: async () => {
          throw new Error("client down");
        },
        lastRssRun: async () => {
          throw new Error("valkey down");
        },
      }),
    );
    expect(r.downloading).toEqual({
      available: false,
      count: 0,
      speed_bytes_per_sec: 0,
      items: [],
    });
    expect(r.rss).toEqual({
      available: false,
      last_run_at: null,
      ok: null,
      releases_found: null,
      next_run_at: null,
    });
    expect(r.delayed).toEqual({ available: true, count: 2 });
    expect(r.reencode.queued).toBe(4);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("reports a null last run as no result yet", async () => {
    const r = await buildDashboardPipeline(
      sources({ lastRssRun: async () => null }),
    );
    expect(r.rss).toEqual({
      available: true,
      last_run_at: null,
      ok: null,
      releases_found: null,
      next_run_at: "2026-01-01T00:15:00.000Z",
    });
  });

  it("reads an errored last run as ok false", async () => {
    const r = await buildDashboardPipeline(
      sources({
        lastRssRun: async () =>
          ({
            status: "error",
            completed_at: "2026-01-01T00:00:00.000Z",
            releases_found: 0,
          }) as never,
      }),
    );
    expect(r.rss.ok).toBe(false);
  });

  it("lists book-only grabs", async () => {
    const r = await buildDashboardPipeline(
      sources({ loadMediaRows: async () => [] }),
    );
    expect(r.downloading.items).toHaveLength(1);
    expect(r.downloading.items[0]).toMatchObject({
      library_media_id: null,
      book_id: 9,
    });
  });

  it("leaves out a grab whose torrent the client does not report", async () => {
    const r = await buildDashboardPipeline(
      sources({
        listTorrents: async () => [torrent("bb", 0.2, 50)],
        loadMediaRows: async () =>
          [
            { id: 1, torrentHash: "aa", media: { id: 7, title: "Movie" } },
          ] as never,
      }),
    );
    expect(r.downloading.items.map((i) => i.id)).toEqual([2]);
  });

  it("marks an unavailable download client when no client is configured as idle", async () => {
    const r = await buildDashboardPipeline(
      sources({ listTorrents: async () => null }),
    );
    expect(r.downloading).toEqual({
      available: true,
      count: 0,
      speed_bytes_per_sec: 0,
      items: [],
    });
  });

  it("keeps gave_up when the alert id list fails", async () => {
    const err = spyOn(console, "error").mockImplementation(() => {});
    const r = await buildDashboardPipeline(
      sources({
        openAlertMediaIds: async () => {
          throw new Error("db");
        },
      }),
    );
    expect(r.attention).toEqual({
      available: true,
      count: 5,
      alerts: 2,
      gave_up: 3,
    });
    err.mockRestore();
  });

  it("marks the attention block unavailable when the alert count fails", async () => {
    const err = spyOn(console, "error").mockImplementation(() => {});
    const r = await buildDashboardPipeline(
      sources({
        countOpenAlerts: async () => {
          throw new Error("db");
        },
      }),
    );
    expect(r.attention.available).toBe(false);
    err.mockRestore();
  });
});
