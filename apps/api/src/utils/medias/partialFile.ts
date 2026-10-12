import { randomUUID } from "node:crypto";
import { readdir, stat, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const SUFFIX = ".rawkoon-partial";
/** A copy still running keeps its temp file fresh; one untouched this long was killed. */
const STALE_MS = 6 * 60 * 60 * 1000;

/** A hidden temp path beside `dst`, unique per attempt, renamed into place once complete. */
export function partialPathFor(dst: string): string {
  return join(dirname(dst), `.${basename(dst)}.${randomUUID()}${SUFFIX}`);
}

/** Remove temp files that a killed copy or merge left beside `dst`. */
export async function removeStalePartials(
  dst: string,
  now: number = Date.now(),
): Promise<void> {
  const dir = dirname(dst);
  const prefix = `.${basename(dst)}.`;
  const names = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    names
      .filter((name) => name.startsWith(prefix) && name.endsWith(SUFFIX))
      .map(async (name) => {
        const path = join(dir, name);
        const st = await stat(path).catch(() => null);
        if (st && now - st.mtimeMs > STALE_MS) {
          await unlink(path).catch(() => {});
        }
      }),
  );
}
