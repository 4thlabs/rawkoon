import { describe, expect, it } from "bun:test";
import {
  bucketGrowthRows,
  daysInMonth,
  growthWindows,
  mondayOf,
  monthStartYmd,
  previousMonthStartYmd,
  previousToDateEndMs,
  toWallMs,
  weekStarts,
  type GrowthRow,
} from "./libraryGrowthMath";

const TZ = "America/Toronto";

describe("month helpers", () => {
  it("finds month starts", () => {
    expect(monthStartYmd("2026-10-12")).toBe("2026-10-01");
    expect(previousMonthStartYmd("2026-10-12")).toBe("2026-09-01");
    expect(previousMonthStartYmd("2026-01-05")).toBe("2025-12-01");
  });
  it("knows month lengths including leap years", () => {
    expect(daysInMonth("2026-02-01")).toBe(28);
    expect(daysInMonth("2028-02-01")).toBe(29);
    expect(daysInMonth("2026-09-01")).toBe(30);
  });
});

describe("previousToDateEndMs", () => {
  const ms = (ymd: string, h = 0) => Date.parse(`${ymd}T00:00:00Z`) + h * 3.6e6;
  it("keeps the same day and time of day", () => {
    const r = previousToDateEndMs("2026-10-12", 5 * 3.6e6);
    expect(r.start).toBe("2026-09-01");
    expect(r.endMs).toBe(ms("2026-09-12", 5));
  });
  it("clamps Mar 31 to Feb 28 and Feb 29", () => {
    expect(previousToDateEndMs("2026-03-31", 0).endMs).toBe(ms("2026-02-28"));
    expect(previousToDateEndMs("2028-03-31", 0).endMs).toBe(ms("2028-02-29"));
  });
});

describe("weeks", () => {
  it("finds the Monday of a week", () => {
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
    expect(mondayOf("2026-10-18")).toBe("2026-10-12");
    expect(mondayOf("2026-10-11")).toBe("2026-10-05");
  });
  it("returns 12 Monday starts, oldest first, last = current week", () => {
    const w = weekStarts("2026-10-15");
    expect(w).toHaveLength(12);
    expect(w[11]).toBe("2026-10-12");
    expect(w[0]).toBe("2026-07-27");
    expect(w.every((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 1)).toBe(
      true,
    );
  });
});

describe("timezone handling", () => {
  it("uses the local date, not the UTC one", () => {
    // 02:30 UTC on Oct 12 is still Oct 11 in Toronto (EDT, UTC-4).
    const w = growthWindows(new Date("2026-10-12T02:30:00Z"), TZ);
    expect(w.month.start).toBe("2026-10-01");
    expect(w.weeks[11].start).toBe("2026-10-05");
  });
  it("rolls the month at local midnight", () => {
    const w = growthWindows(new Date("2026-11-01T03:59:00Z"), TZ);
    expect(w.month.start).toBe("2026-10-01");
    const after = growthWindows(new Date("2026-11-01T05:00:00Z"), TZ);
    expect(after.month.start).toBe("2026-11-01");
  });
  it("reads wall time across the DST change", () => {
    // Nov 1 2026 06:30 UTC is 01:30 EDT; Nov 1 2026 07:30 UTC is 01:30 EST.
    const a = toWallMs(new Date("2026-11-01T05:30:00Z"), TZ);
    const b = toWallMs(new Date("2026-11-01T06:30:00Z"), TZ);
    expect(a).toBe(b);
    expect(toWallMs(new Date("2026-11-01T08:00:00Z"), TZ)).toBe(
      Date.parse("2026-11-01T03:00:00Z"),
    );
  });
});

describe("bucketGrowthRows", () => {
  // Monday Oct 12 2026 10:00 local (14:00 UTC).
  const now = new Date("2026-10-12T14:00:00Z");
  const windows = growthWindows(now, TZ);
  const row = (iso: string, kind: GrowthRow["kind"], bytes = 0): GrowthRow => ({
    t: new Date(iso),
    kind,
    bytes,
  });

  it("splits rows into month, previous window and weeks", () => {
    const rows = [
      row("2026-10-12T12:00:00Z", "episode", 100),
      row("2026-10-03T12:00:00Z", "movie", 1000),
      row("2026-10-04T12:00:00Z", "book", 5),
      row("2026-10-05T12:00:00Z", "upgrade"),
      // previous month, before the same point
      row("2026-09-02T12:00:00Z", "episode", 10),
      // previous month, after the same point (Sep 20)
      row("2026-09-20T12:00:00Z", "episode", 20),
      // previous month, day 12 but later than 10:00 local
      row("2026-09-12T20:00:00Z", "movie", 30),
      // before day 1 of previous month
      row("2026-08-31T12:00:00Z", "episode", 999),
    ];
    const b = bucketGrowthRows(rows, windows);
    expect(b.month).toMatchObject({
      start: "2026-10-01",
      movies: 1,
      episodes: 1,
      books: 1,
      upgrades: 1,
      bytes: 1105,
    });
    expect(b.previous_to_date).toMatchObject({
      start: "2026-09-01",
      episodes: 1,
      movies: 0,
      bytes: 10,
    });
    expect(b.previous_month).toMatchObject({
      episodes: 2,
      movies: 1,
      bytes: 60,
    });
    expect(b.weeks).toHaveLength(12);
    expect(b.weeks[11]).toMatchObject({ start: "2026-10-12", episodes: 1 });
    expect(b.weeks[10]).toMatchObject({ start: "2026-10-05", books: 0 });
    // Oct 3 (Sat) and Oct 4 (Sun) belong to the week of Sep 28.
    expect(b.weeks[9]).toMatchObject({
      start: "2026-09-28",
      movies: 1,
      books: 1,
    });
  });

  it("buckets by local day near midnight", () => {
    // 03:00 UTC Oct 12 = Oct 11 23:00 local: previous week, not current.
    const b = bucketGrowthRows(
      [row("2026-10-12T03:00:00Z", "episode", 1)],
      windows,
    );
    expect(b.weeks[11].episodes).toBe(0);
    expect(b.weeks[10].episodes).toBe(1);
  });

  it("returns zeroed buckets for no rows", () => {
    const b = bucketGrowthRows([], windows);
    expect(b.month.bytes).toBe(0);
    expect(b.weeks.every((w) => w.episodes === 0)).toBe(true);
  });
});
