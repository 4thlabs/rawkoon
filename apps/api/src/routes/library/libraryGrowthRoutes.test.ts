import { beforeEach, describe, expect, it, mock } from "bun:test";

let isAdmin = false;
const queryRaw = mock(async (strings: TemplateStringsArray) => {
  const sql = strings.join("?");
  if (sql.includes("LEAST("))
    return [{ first: new Date("2026-04-07T12:00:00Z") }];
  return [
    { t: new Date(Date.now() - 1000), bytes: 5_000_000_000n, kind: "episode" },
    { t: new Date(Date.now() - 1000), bytes: 0n, kind: "upgrade" },
  ];
});

mock.module("@rawkoon/api/db", () => ({
  prisma: { $queryRaw: queryRaw },
}));
mock.module("@rawkoon/api/middleware/hono/auth", () => ({
  requireUser: async (
    c: { set: (key: string, value: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set("user", { id: "u1", is_admin: isAdmin });
    await next();
  },
}));
mock.module("@rawkoon/api/services/cache", () => ({
  getJsonCache: async () => null,
  setJsonCache: async () => undefined,
}));

const { libraryJobStatsRoutes } = await import("./libraryJobStatsRoutes");

type Growth = {
  growth: {
    month: { episodes: number; upgrades: number; bytes: number | null };
    weeks: { bytes: number | null }[];
    previous_to_date: { bytes: number | null };
    previous_month: { bytes: number | null };
    since: string | null;
  };
};

describe("GET /growth", () => {
  beforeEach(() => queryRaw.mockClear());

  it("hides bytes from members", async () => {
    isAdmin = false;
    const res = await libraryJobStatsRoutes.request("/growth");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Growth;
    expect(body.growth.month.bytes).toBeNull();
    expect(body.growth.previous_to_date.bytes).toBeNull();
    expect(body.growth.previous_month.bytes).toBeNull();
    expect(body.growth.weeks).toHaveLength(12);
    expect(body.growth.weeks.every((w) => w.bytes === null)).toBe(true);
    expect(body.growth.month.episodes).toBe(1);
    expect(body.growth.month.upgrades).toBe(1);
    expect(body.growth.since).toBe("2026-04-07");
  });

  it("includes byte totals as numbers for admins", async () => {
    isAdmin = true;
    const res = await libraryJobStatsRoutes.request("/growth");
    const body = (await res.json()) as Growth;
    expect(body.growth.month.bytes).toBe(5_000_000_000);
    expect(body.growth.weeks[11].bytes).toBe(5_000_000_000);
  });

  it("runs two queries per request", async () => {
    await libraryJobStatsRoutes.request("/growth");
    expect(queryRaw).toHaveBeenCalledTimes(2);
  });
});
