import { beforeEach, describe, expect, it, mock } from "bun:test";

let media: { id: number; type: string; status: string } | null = null;
const grabRelease = mock(async () => ({
  grabbed: true as boolean,
  releaseTitle: "New.Release.2160p",
  reason: "",
}));
const cancelActiveMovieDownloads = mock(async () => ({ cancelled: 1 }));

mock.module("@rawkoon/api/db", () => ({
  prisma: {
    libraryMedia: { findUnique: async () => media },
    libraryEpisode: { findFirst: async () => null, findMany: async () => [] },
  },
}));
mock.module("@rawkoon/api/middleware/hono/auth", () => ({
  requireAdmin: async (_c: unknown, next: () => Promise<void>) => next(),
}));
mock.module("@rawkoon/api/services/mediaGrabberGrab", () => ({ grabRelease }));
mock.module("@rawkoon/api/services/replaceActiveDownload", () => ({
  cancelActiveMovieDownloads,
}));

const { libraryGrabRoutes } = await import("./libraryGrabRoutes");

const grab = (extra: Record<string, unknown> = {}) =>
  libraryGrabRoutes.request("/1/grab", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      download_url: "magnet:?xt=urn:btih:abc",
      release_title: "New.Release.2160p",
      ...extra,
    }),
  });

describe("POST /:id/grab replace", () => {
  beforeEach(() => {
    media = { id: 1, type: "movie", status: "downloading" };
    grabRelease.mockClear();
    cancelActiveMovieDownloads.mockClear();
    grabRelease.mockImplementation(async () => ({
      grabbed: true,
      releaseTitle: "New.Release.2160p",
      reason: "",
    }));
  });

  it("refuses a downloading movie without the flag", async () => {
    const res = await grab();
    expect(res.status).toBe(400);
    expect(cancelActiveMovieDownloads).not.toHaveBeenCalled();
    expect(grabRelease).not.toHaveBeenCalled();
  });

  it("stops the running download, then grabs, when replace is set", async () => {
    const res = await grab({ replace: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      grabbed: true,
      release_title: "New.Release.2160p",
    });
    expect(cancelActiveMovieDownloads).toHaveBeenCalledWith(1);
    expect(grabRelease).toHaveBeenCalledTimes(1);
  });

  it("reports that the old download is gone when the new grab fails", async () => {
    grabRelease.mockImplementation(async () => ({
      grabbed: false,
      releaseTitle: "",
      reason: "Blocklisted: bad release",
    }));
    const res = await grab({ replace: true });
    expect(await res.json()).toEqual({
      grabbed: false,
      reason: "Blocklisted: bad release",
      replaced_previous: true,
    });
  });

  it("does not cancel anything for a movie that is not downloading", async () => {
    media = { id: 1, type: "movie", status: "wanted" };
    const res = await grab({ replace: true });
    expect(res.status).toBe(200);
    expect(cancelActiveMovieDownloads).not.toHaveBeenCalled();
  });

  it("rejects replace on a show", async () => {
    media = { id: 1, type: "show", status: "wanted" };
    const res = await grab({ replace: true });
    expect(res.status).toBe(400);
  });
});
