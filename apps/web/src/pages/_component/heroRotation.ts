// Mirrors RawkoonKit's HeroRotation so web and iOS rotate the Home hero the same way.

export const HERO_ROTATE_SECONDS = 8;

/** The slide after `current`, wrapping to the first; 0 when there is nothing to rotate. */
export function nextHeroIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  return (clampHeroIndex(current, count) + 1) % count;
}

/** Keeps a stored index valid when the item count shrinks (or grows from empty). */
export function clampHeroIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}
