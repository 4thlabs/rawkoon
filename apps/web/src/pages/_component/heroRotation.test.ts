import { describe, expect, it } from "vitest";
import { clampHeroIndex, nextHeroIndex } from "@/pages/_component/heroRotation";

// Same table as RawkoonKit's HeroRotationTests; change both together.
describe("nextHeroIndex", () => {
  it.each([
    [0, 5, 1],
    [3, 5, 4],
    [4, 5, 0],
    [0, 1, 0],
    [0, 0, 0],
    [7, 3, 0],
    [-2, 3, 1],
  ] as const)("after %i of %i comes %i", (current, count, expected) => {
    expect(nextHeroIndex(current, count)).toBe(expected);
  });
});

describe("clampHeroIndex", () => {
  it.each([
    [2, 5, 2],
    [4, 3, 2],
    [-1, 3, 0],
    [3, 0, 0],
    [0, 1, 0],
  ] as const)("index %i of %i clamps to %i", (index, count, expected) => {
    expect(clampHeroIndex(index, count)).toBe(expected);
  });
});
