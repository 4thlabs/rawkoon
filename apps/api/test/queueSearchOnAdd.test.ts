import { describe, expect, it } from "bun:test";
import {
  queueSearchOnAdd,
  searchOnAddJobId,
} from "@rawkoon/api/services/searchOnAdd";

function harness(enabled: boolean, fail = false, seasons: number[] = [1, 2]) {
  const calls: Array<number | string> = [];
  const deps = {
    isEnabled: async () => enabled,
    airedSeasons: async () => seasons,
    enqueue: async (mediaId: number, season?: number) => {
      if (fail) throw new Error("redis down");
      calls.push(season == null ? mediaId : `${mediaId}-s${season}`);
    },
  };
  return { calls, deps };
}

const past = new Date("2020-01-01");
const movie = {
  id: 7,
  type: "movie",
  status: "wanted",
  monitored: true,
  digitalReleaseDate: past,
};
const show = {
  id: 8,
  type: "show",
  status: "wanted",
  monitored: true,
  digitalReleaseDate: null,
};

describe("searchOnAddJobId", () => {
  it("is stable per title and has no ':' (BullMQ rejects it)", () => {
    expect(searchOnAddJobId(7)).toBe("search-on-add-7");
    expect(searchOnAddJobId(7)).not.toContain(":");
  });
});

describe("searchOnAddJobId per season", () => {
  it("adds a season suffix without ':'", () => {
    expect(searchOnAddJobId(8, 3)).toBe("search-on-add-8-s3");
    expect(searchOnAddJobId(8, 3)).not.toContain(":");
  });
});

describe("queueSearchOnAdd", () => {
  it("queues one job per aired season for a show", async () => {
    const h = harness(true, false, [1, 3]);
    const r = await queueSearchOnAdd(show, undefined, h.deps);
    expect(r.search_queued).toBe(true);
    expect(h.calls).toEqual(["8-s1", "8-s3"]);
  });

  it("queues nothing for a show with no aired wanted episodes", async () => {
    const h = harness(true, false, []);
    const r = await queueSearchOnAdd(show, undefined, h.deps);
    expect(r).toEqual({ search_queued: false, search_skipped_reason: null });
  });

  it("does not queue an unmonitored title", async () => {
    const h = harness(true);
    for (const m of [movie, show]) {
      const r = await queueSearchOnAdd(
        { ...m, monitored: false },
        undefined,
        h.deps,
      );
      expect(r.search_skipped_reason).toBe("not_monitored");
    }
    expect(h.calls).toHaveLength(0);
  });

  it("queues a released movie when the setting is on", async () => {
    const h = harness(true);
    const r = await queueSearchOnAdd(movie, undefined, h.deps);
    expect(r).toEqual({ search_queued: true, search_skipped_reason: null });
    expect(h.calls).toHaveLength(1);
    expect(h.calls).toEqual([7]);
  });

  it("queues a show regardless of its release date", async () => {
    const h = harness(true);
    expect(
      (await queueSearchOnAdd(show, undefined, h.deps)).search_queued,
    ).toBe(true);
  });

  it("does not queue when the setting is off", async () => {
    const h = harness(false);
    const r = await queueSearchOnAdd(movie, undefined, h.deps);
    expect(r).toEqual({
      search_queued: false,
      search_skipped_reason: "setting_off",
    });
    expect(h.calls).toHaveLength(0);
  });

  it("an explicit off overrides the setting", async () => {
    const h = harness(true);
    const r = await queueSearchOnAdd(movie, false, h.deps);
    expect(r.search_skipped_reason).toBe("override_off");
    expect(h.calls).toHaveLength(0);
  });

  it("an explicit on overrides a disabled setting", async () => {
    const h = harness(false);
    expect((await queueSearchOnAdd(movie, true, h.deps)).search_queued).toBe(
      true,
    );
  });

  it("does not queue an unreleased movie and reports its date", async () => {
    const h = harness(true);
    const r = await queueSearchOnAdd(
      { ...movie, digitalReleaseDate: new Date("2999-03-04") },
      undefined,
      h.deps,
    );
    expect(r).toEqual({
      search_queued: false,
      search_skipped_reason: "not_released",
      digital_release_date: "2999-03-04",
    });
    expect(h.calls).toHaveLength(0);
  });

  it("treats a movie with no date as not released", async () => {
    const h = harness(true);
    const r = await queueSearchOnAdd(
      { ...movie, digitalReleaseDate: null },
      undefined,
      h.deps,
    );
    expect(r.search_skipped_reason).toBe("not_released");
    expect(r.digital_release_date).toBeNull();
  });

  it("does not search a movie that is no longer wanted", async () => {
    const h = harness(true);
    const r = await queueSearchOnAdd(
      { ...movie, status: "downloaded" },
      undefined,
      h.deps,
    );
    expect(r).toEqual({ search_queued: false, search_skipped_reason: null });
  });

  it("swallows a queue failure so the add still succeeds", async () => {
    const h = harness(true, true);
    const r = await queueSearchOnAdd(movie, undefined, h.deps);
    expect(r).toEqual({ search_queued: false, search_skipped_reason: null });
  });
});
