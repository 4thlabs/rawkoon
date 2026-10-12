import { addDaysYmd } from "@rawkoon/api/services/books/listeningStatsMath";

export const GROWTH_WEEKS = 12;
const DAY_MS = 86_400_000;

export type GrowthKind = "movie" | "episode" | "book" | "upgrade";

export type GrowthRow = { t: Date; bytes: number; kind: GrowthKind };

export type GrowthCounts = {
  start: string;
  movies: number;
  episodes: number;
  books: number;
  upgrades: number;
  bytes: number;
};

/** Windows are in "wall ms": local clock fields read as if they were UTC. */
export type GrowthWindows = {
  timezone: string;
  month: { start: string; startMs: number; endMs: number };
  previousToDate: { start: string; startMs: number; endMs: number };
  previousMonth: { start: string; startMs: number; endMs: number };
  weeks: { start: string; startMs: number; endMs: number }[];
};

type WallParts = { ymd: string; msOfDay: number };

const ymdMs = (ymd: string): number => Date.parse(`${ymd}T00:00:00.000Z`);

/** Local clock of an instant in `timeZone`, read as a UTC timestamp. */
export function toWallMs(instant: Date, timeZone: string): number {
  const parts = wallParts(instant, timeZone);
  return ymdMs(parts.ymd) + parts.msOfDay;
}

function wallParts(instant: Date, timeZone: string): WallParts {
  const fields: Record<string, number> = {};
  for (const p of new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)) {
    if (p.type !== "literal") fields[p.type] = Number(p.value);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    ymd: `${String(fields.year).padStart(4, "0")}-${pad(fields.month)}-${pad(fields.day)}`,
    msOfDay:
      ((fields.hour * 60 + fields.minute) * 60 + fields.second) * 1000 +
      instant.getUTCMilliseconds(),
  };
}

export function monthStartYmd(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function previousMonthStartYmd(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 10);
}

export function daysInMonth(monthStart: string): number {
  const [y, m] = monthStart.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Monday of the ISO week containing `ymd`. */
export function mondayOf(ymd: string): string {
  const dow = (new Date(ymdMs(ymd)).getUTCDay() + 6) % 7;
  return addDaysYmd(ymd, -dow);
}

/** Monday starts of the 12 weeks ending with the one containing `ymd`. */
export function weekStarts(ymd: string, count = GROWTH_WEEKS): string[] {
  const current = mondayOf(ymd);
  return Array.from({ length: count }, (_, i) =>
    addDaysYmd(current, -7 * (count - 1 - i)),
  );
}

/**
 * Previous month from day 1 to the same day-of-month and time of day as `now`,
 * with the day clamped to that month's length (Mar 31 -> Feb 28/29).
 */
export function previousToDateEndMs(
  nowYmd: string,
  msOfDay: number,
): { start: string; endMs: number } {
  const start = previousMonthStartYmd(nowYmd);
  const day = Math.min(Number(nowYmd.slice(8, 10)), daysInMonth(start));
  return { start, endMs: ymdMs(start) + (day - 1) * DAY_MS + msOfDay };
}

export function growthWindows(now: Date, timeZone: string): GrowthWindows {
  const { ymd, msOfDay } = wallParts(now, timeZone);
  const nowMs = ymdMs(ymd) + msOfDay;
  const monthStart = monthStartYmd(ymd);
  const prev = previousToDateEndMs(ymd, msOfDay);
  const monthStartMs = ymdMs(monthStart);
  const weeks = weekStarts(ymd).map((start) => ({
    start,
    startMs: ymdMs(start),
    endMs: ymdMs(start) + 7 * DAY_MS - 1,
  }));
  return {
    timezone: timeZone,
    month: { start: monthStart, startMs: monthStartMs, endMs: nowMs },
    previousToDate: {
      start: prev.start,
      startMs: ymdMs(prev.start),
      endMs: prev.endMs,
    },
    previousMonth: {
      start: prev.start,
      startMs: ymdMs(prev.start),
      endMs: monthStartMs - 1,
    },
    weeks,
  };
}

/** Earliest wall instant any window needs. */
export function earliestWindowMs(w: GrowthWindows): number {
  return Math.min(w.weeks[0].startMs, w.previousMonth.startMs);
}

const emptyCounts = (start: string): GrowthCounts => ({
  start,
  movies: 0,
  episodes: 0,
  books: 0,
  upgrades: 0,
  bytes: 0,
});

function add(target: GrowthCounts, row: GrowthRow): void {
  if (row.kind === "movie") target.movies += 1;
  else if (row.kind === "episode") target.episodes += 1;
  else if (row.kind === "book") target.books += 1;
  else target.upgrades += 1;
  target.bytes += row.bytes;
}

export type GrowthBuckets = {
  month: GrowthCounts;
  previous_to_date: GrowthCounts;
  previous_month: GrowthCounts;
  weeks: GrowthCounts[];
};

/** Assigns each landed row to the month, previous-month and weekly windows. */
export function bucketGrowthRows(
  rows: GrowthRow[],
  windows: GrowthWindows,
): GrowthBuckets {
  const month = emptyCounts(windows.month.start);
  const previousToDate = emptyCounts(windows.previousToDate.start);
  const previousMonth = emptyCounts(windows.previousMonth.start);
  const weeks = windows.weeks.map((w) => emptyCounts(w.start));

  for (const row of rows) {
    const ms = toWallMs(row.t, windows.timezone);
    if (ms >= windows.month.startMs && ms <= windows.month.endMs) {
      add(month, row);
    }
    if (
      ms >= windows.previousMonth.startMs &&
      ms <= windows.previousMonth.endMs
    ) {
      add(previousMonth, row);
      if (ms <= windows.previousToDate.endMs) add(previousToDate, row);
    }
    const idx = windows.weeks.findIndex(
      (w) => ms >= w.startMs && ms <= w.endMs,
    );
    if (idx >= 0) {
      // Rows after "now" within the current week cannot exist; keep them anyway.
      add(weeks[idx], row);
    }
  }
  return {
    month,
    previous_to_date: previousToDate,
    previous_month: previousMonth,
    weeks,
  };
}
