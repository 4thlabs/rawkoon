import type { LibraryGrowth, LibraryGrowthBucket } from "@rawkoon/shared/types";

/** Titles that landed in a bucket; books only count when the feature is on. */
export function titlesIn(
  bucket: LibraryGrowthBucket,
  booksEnabled: boolean,
): number {
  return bucket.movies + bucket.episodes + (booksEnabled ? bucket.books : 0);
}

/** The headline metric: bytes for admins (when sent), titles otherwise. */
export function metricIn(
  bucket: LibraryGrowthBucket,
  showBytes: boolean,
  booksEnabled: boolean,
): number {
  return showBytes && bucket.bytes !== null
    ? bucket.bytes
    : titlesIn(bucket, booksEnabled);
}

/** Percent change vs the previous figure; null when there is no baseline. */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Hidden when nothing landed this month nor in any of the 12 weeks. */
export function isGrowthEmpty(growth: LibraryGrowth): boolean {
  const zero = (b: LibraryGrowthBucket) =>
    b.movies + b.episodes + b.books + b.upgrades === 0 && !b.bytes;
  return zero(growth.month) && growth.weeks.every(zero);
}

/** True when the whole week (Mon-Sun) ends before the first recorded landing. */
export function isBeforeSince(
  weekStart: string,
  since: string | null,
): boolean {
  if (since === null) return true;
  const end = new Date(`${weekStart}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return end.toISOString().slice(0, 10) < since;
}

/** Bar height in percent of the tallest bar; non-zero values stay visible. */
export function barHeightPercent(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(6, Math.round((value / max) * 100));
}
