import { describe, expect, it, spyOn } from "bun:test";
import { mapSettings } from "@rawkoon/api/routes/library/libraryMediaAdmin";
import {
  RELEASE_CHECK_JOB_NAMES,
  applyReleaseCheckSchedule,
  loadReleaseCheckCron,
  parseReleaseCheckCron,
  registerSchedulers,
  rescheduleThenPersist,
} from "@rawkoon/api/services/releaseCheckSchedule";

function fakeQueue(failOn?: (pattern: string, id: string) => boolean) {
  const calls: string[] = [];
  return {
    calls,
    queue: {
      upsertJobScheduler: async (
        id: string,
        repeat: { pattern?: string },
        template?: { name?: string },
      ) => {
        const pattern = repeat.pattern ?? "";
        if (failOn?.(pattern, id)) throw new Error("bad pattern");
        calls.push(`upsert ${id} ${pattern} ${template?.name}`);
        return undefined as never;
      },
    },
  };
}

describe("applyReleaseCheckSchedule", () => {
  it("upserts the movie and episode schedulers in place, without removing them", async () => {
    const { calls, queue } = fakeQueue();
    await applyReleaseCheckSchedule("0 */3 * * *", queue);
    expect(calls).toEqual([
      "upsert check-library-movie-releases 0 */3 * * * check-library-movie-releases",
      "upsert check-library-episode-releases 0 */3 * * * check-library-episode-releases",
    ]);
  });

  it("targets exactly the movie and episode release checks", () => {
    expect([...RELEASE_CHECK_JOB_NAMES]).toEqual([
      "check-library-movie-releases",
      "check-library-episode-releases",
    ]);
  });
});

describe("parseReleaseCheckCron", () => {
  it("accepts and normalizes a valid cron", () => {
    expect(parseReleaseCheckCron(" 0  */4 * * * ")).toEqual({
      ok: true,
      cron: "0 */4 * * *",
    });
  });

  it.each(["0 0 31 2 *", "0 0 30 2 *", "0 0 31 4 *", "nope", "* * * *"])(
    "rejects %s",
    (expr) => {
      expect(parseReleaseCheckCron(expr).ok).toBe(false);
    },
  );

  it("accepts 29 February", () => {
    expect(parseReleaseCheckCron("0 0 29 2 *").ok).toBe(true);
  });

  it("rejects an interval under 15 minutes", () => {
    const result = parseReleaseCheckCron("*/10 * * * *");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("15 minutes");
  });
});

describe("loadReleaseCheckCron", () => {
  it("falls back to every 6 hours when no settings row can be read", async () => {
    expect(await loadReleaseCheckCron()).toBe("0 */6 * * *");
  });

  it("returns a stored valid cron", async () => {
    expect(await loadReleaseCheckCron(async () => "30 4 * * *")).toBe(
      "30 4 * * *",
    );
  });

  it("falls back with a warning when the stored value cannot be scheduled", async () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(await loadReleaseCheckCron(async () => "0 0 31 2 *")).toBe(
        "0 */6 * * *",
      );
      expect(await loadReleaseCheckCron(async () => "*/5 * * * *")).toBe(
        "0 */6 * * *",
      );
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });

  it("falls back when reading throws", async () => {
    expect(
      await loadReleaseCheckCron(async () => {
        throw new Error("db down");
      }),
    ).toBe("0 */6 * * *");
  });
});

describe("registerSchedulers", () => {
  it("keeps registering the remaining jobs when one pattern is rejected", async () => {
    const error = spyOn(console, "error").mockImplementation(() => {});
    const log = spyOn(console, "log").mockImplementation(() => {});
    try {
      const { calls, queue } = fakeQueue((pattern) => pattern === "bad");
      await registerSchedulers(
        [
          { name: "a", pattern: "0 * * * *" },
          { name: "b", pattern: "bad" },
          { name: "c", pattern: "0 3 * * *" },
        ],
        queue,
      );
      expect(calls).toEqual(["upsert a 0 * * * * a", "upsert c 0 3 * * * c"]);
      expect(error).toHaveBeenCalledTimes(1);
    } finally {
      error.mockRestore();
      log.mockRestore();
    }
  });
});

describe("rescheduleThenPersist", () => {
  it("schedules before it persists", async () => {
    const { calls, queue } = fakeQueue();
    const order: string[] = [];
    await rescheduleThenPersist(
      "0 */3 * * *",
      "0 */6 * * *",
      async () => {
        order.push(`persist after ${calls.length} upserts`);
      },
      queue,
    );
    expect(order).toEqual(["persist after 2 upserts"]);
  });

  it("leaves the stored value unchanged and restores the old schedule when scheduling fails", async () => {
    let persisted = false;
    const { calls, queue } = fakeQueue(
      (pattern, id) =>
        pattern === "0 */3 * * *" && id === "check-library-episode-releases",
    );
    await expect(
      rescheduleThenPersist(
        "0 */3 * * *",
        "0 */6 * * *",
        async () => {
          persisted = true;
        },
        queue,
      ),
    ).rejects.toThrow("bad pattern");
    expect(persisted).toBe(false);
    expect(calls).toEqual([
      "upsert check-library-movie-releases 0 */3 * * * check-library-movie-releases",
      "upsert check-library-movie-releases 0 */6 * * * check-library-movie-releases",
      "upsert check-library-episode-releases 0 */6 * * * check-library-episode-releases",
    ]);
  });

  it("restores the old schedule when persisting fails", async () => {
    const { calls, queue } = fakeQueue();
    await expect(
      rescheduleThenPersist(
        "0 */3 * * *",
        "0 */6 * * *",
        async () => {
          throw new Error("db down");
        },
        queue,
      ),
    ).rejects.toThrow("db down");
    expect(calls.slice(-2)).toEqual([
      "upsert check-library-movie-releases 0 */6 * * * check-library-movie-releases",
      "upsert check-library-episode-releases 0 */6 * * * check-library-episode-releases",
    ]);
  });
});

describe("mapSettings release_check_cron", () => {
  const row = (over: Record<string, unknown> = {}) =>
    ({
      fileOperation: "hardlink",
      movieTemplate: "",
      episodeTemplate: "",
      minSeedRatio: 0,
      postProcessingEnabled: false,
      updatedAt: new Date("2026-08-24T00:00:00Z"),
      ...over,
    }) as never;

  it("defaults to every 6 hours", () => {
    expect(mapSettings(row()).release_check_cron).toBe("0 */6 * * *");
  });

  it("maps the stored cron", () => {
    expect(
      mapSettings(row({ releaseCheckCron: "30 4 * * *" })).release_check_cron,
    ).toBe("30 4 * * *");
  });
});
