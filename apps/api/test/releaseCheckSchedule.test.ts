import { describe, expect, it } from "bun:test";
import { mapSettings } from "@rawkoon/api/routes/library/libraryMediaAdmin";
import {
  RELEASE_CHECK_JOB_NAMES,
  applyReleaseCheckSchedule,
  loadReleaseCheckCron,
} from "@rawkoon/api/services/releaseCheckSchedule";

function fakeQueue() {
  const calls: string[] = [];
  return {
    calls,
    queue: {
      removeJobScheduler: async (id: string) => {
        calls.push(`remove ${id}`);
        return true;
      },
      upsertJobScheduler: async (
        id: string,
        repeat: { pattern?: string },
        template?: { name?: string },
      ) => {
        calls.push(`upsert ${id} ${repeat.pattern} ${template?.name}`);
        return undefined as never;
      },
    },
  };
}

describe("applyReleaseCheckSchedule", () => {
  it("replaces the movie and episode schedulers with the new pattern", async () => {
    const { calls, queue } = fakeQueue();
    await applyReleaseCheckSchedule("0 */3 * * *", queue);
    expect(calls).toEqual([
      "remove check-library-movie-releases",
      "upsert check-library-movie-releases 0 */3 * * * check-library-movie-releases",
      "remove check-library-episode-releases",
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

describe("loadReleaseCheckCron", () => {
  it("falls back to every 6 hours when no settings row can be read", async () => {
    expect(await loadReleaseCheckCron()).toBe("0 */6 * * *");
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
