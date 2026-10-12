import { describe, expect, it } from "bun:test";
import { mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { partialPathFor, removeStalePartials } from "./partialFile";

const HOUR = 60 * 60 * 1000;

async function withDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "rawkoon-partial-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function aged(path: string, ageMs: number): Promise<void> {
  await writeFile(path, "x");
  const when = new Date(Date.now() - ageMs);
  await utimes(path, when, when);
}

describe("removeStalePartials", () => {
  it("removes old temp files for the destination and keeps everything else", async () => {
    await withDir(async (dir) => {
      const dst = join(dir, "Show - S01E01.mkv");
      const stale = partialPathFor(dst);
      const fresh = partialPathFor(dst);
      const otherEpisode = partialPathFor(join(dir, "Show - S01E02.mkv"));
      const upgradeTemp = join(dir, ".Show - S01E01.mkv.rawkoon-upgrade");
      await aged(stale, 7 * HOUR);
      await aged(fresh, 1 * HOUR);
      await aged(otherEpisode, 7 * HOUR);
      await aged(upgradeTemp, 7 * HOUR);
      await aged(dst, 7 * HOUR);

      await removeStalePartials(dst);

      expect((await readdir(dir)).sort()).toEqual(
        [fresh, otherEpisode, upgradeTemp, dst]
          .map((p) => p.slice(dir.length + 1))
          .sort(),
      );
    });
  });

  it("does nothing when the destination folder doesn't exist yet", async () => {
    await withDir(async (dir) => {
      await removeStalePartials(join(dir, "missing", "Movie.mkv"));
      expect(await readdir(dir)).toEqual([]);
    });
  });
});
