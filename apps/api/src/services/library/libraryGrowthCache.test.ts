import { describe, expect, it } from "bun:test";
import { growthCacheKey } from "./libraryGrowth";

describe("growthCacheKey", () => {
  const TZ = "America/Toronto";

  it("separates admins from members", () => {
    const now = new Date("2026-10-12T14:00:00Z");
    expect(growthCacheKey(true, now, TZ)).not.toBe(
      growthCacheKey(false, now, TZ),
    );
  });

  it("changes at local midnight, so a month's response never serves the next", () => {
    const beforeMidnight = new Date("2026-11-01T03:59:00Z"); // Oct 31, 23:59 local
    const afterMidnight = new Date("2026-11-01T04:01:00Z"); // Nov 1, 00:01 local
    expect(growthCacheKey(true, beforeMidnight, TZ)).toBe(
      "library:growth:admin:2026-10-31",
    );
    expect(growthCacheKey(true, afterMidnight, TZ)).toBe(
      "library:growth:admin:2026-11-01",
    );
  });
});
