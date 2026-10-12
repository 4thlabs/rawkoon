import { describe, expect, it } from "vitest";
import type { LibraryGrowth, LibraryGrowthBucket } from "@rawkoon/shared/types";
import {
  barHeightPercent,
  deltaPercent,
  isBeforeSince,
  isGrowthEmpty,
  metricIn,
  titlesIn,
} from "./growthMath";

const bucket = (
  over: Partial<LibraryGrowthBucket> = {},
): LibraryGrowthBucket => ({
  start: "2026-10-01",
  movies: 0,
  episodes: 0,
  books: 0,
  upgrades: 0,
  bytes: 0,
  ...over,
});

const growth = (over: Partial<LibraryGrowth> = {}): LibraryGrowth => ({
  timezone: "America/Toronto",
  month: bucket(),
  previous_to_date: bucket(),
  previous_month: bucket(),
  weeks: Array.from({ length: 12 }, () => bucket()),
  since: null,
  ...over,
});

describe("headline metric", () => {
  const b = bucket({ movies: 1, episodes: 2, books: 3, bytes: 500 });
  it("counts titles, dropping books when disabled", () => {
    expect(titlesIn(b, true)).toBe(6);
    expect(titlesIn(b, false)).toBe(3);
  });
  it("uses bytes for admins and titles otherwise", () => {
    expect(metricIn(b, true, true)).toBe(500);
    expect(metricIn(bucket({ ...b, bytes: null }), true, true)).toBe(6);
    expect(metricIn(b, false, true)).toBe(6);
  });
});

describe("deltaPercent", () => {
  it("rounds the change", () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(50, 100)).toBe(-50);
    expect(deltaPercent(100, 100)).toBe(0);
  });
  it("is null without a baseline", () => {
    expect(deltaPercent(10, 0)).toBeNull();
  });
});

describe("isGrowthEmpty", () => {
  it("is true when every bucket is zero", () => {
    expect(isGrowthEmpty(growth())).toBe(true);
  });
  it("is false when any week has activity", () => {
    const g = growth();
    g.weeks[3] = bucket({ episodes: 1 });
    expect(isGrowthEmpty(g)).toBe(false);
  });
  it("is false when the month has activity", () => {
    expect(isGrowthEmpty(growth({ month: bucket({ movies: 1 }) }))).toBe(false);
  });
  it("treats null bytes as zero", () => {
    expect(isGrowthEmpty(growth({ month: bucket({ bytes: null }) }))).toBe(
      true,
    );
  });
});

describe("isBeforeSince", () => {
  it("marks weeks that end before the first landing", () => {
    expect(isBeforeSince("2026-04-06", "2026-04-07")).toBe(false);
    expect(isBeforeSince("2026-03-30", "2026-04-07")).toBe(true);
  });
  it("marks everything as no data when nothing landed", () => {
    expect(isBeforeSince("2026-10-05", null)).toBe(true);
  });
});

describe("barHeightPercent", () => {
  it("scales to the tallest bar with a visible floor", () => {
    expect(barHeightPercent(50, 100)).toBe(50);
    expect(barHeightPercent(1, 1000)).toBe(6);
    expect(barHeightPercent(0, 100)).toBe(0);
    expect(barHeightPercent(5, 0)).toBe(0);
  });
});
