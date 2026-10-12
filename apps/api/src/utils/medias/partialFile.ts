import { randomUUID } from "node:crypto";
import { readdir, stat, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const SUFFIX = ".rawkoon-partial";
/** A copy still running keeps its temp file fresh; one untouched this long was killed. */
const STALE_MS = 6 * 60 * 60 * 1000;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Temp files being written by this process, never treated as leftovers however long they stall. */
const active = new Set<string>();

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A hidden temp path beside `dst`, unique per attempt, renamed into place once complete. */
export function partialPathFor(dst: string): string {
  return join(dirname(dst), `.${basename(dst)}.${randomUUID()}${SUFFIX}`);
}

/** Run `write` against a temp path for `dst`, which cleanup leaves alone meanwhile. */
export async function withPartial<T>(
  dst: string,
  write: (partial: string) => Promise<T>,
): Promise<T> {
  const partial = partialPathFor(dst);
  active.add(partial);
  try {
    return await write(partial);
  } finally {
    active.delete(partial);
  }
}

/** Remove temp files that a killed copy or merge left beside `dst`. */
export async function removeStalePartials(
  dst: string,
  now: number = Date.now(),
): Promise<void> {
  const dir = dirname(dst);
  const own = new RegExp(
    `^\\.${escapeRegExp(basename(dst))}\\.${UUID}${escapeRegExp(SUFFIX)}$`,
  );
  const names = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    names
      .filter((name) => own.test(name))
      .map(async (name) => {
        const path = join(dir, name);
        if (active.has(path)) return;
        const st = await stat(path).catch(() => null);
        if (st && now - st.mtimeMs > STALE_MS) {
          await unlink(path).catch(() => {});
        }
      }),
  );
}
