import { describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";

let user: { id: string; is_admin: boolean } | null = null;
mock.module("@rawkoon/api/middleware/auth", () => ({
  resolveUser: async () => user,
}));

const payload = {
  downloading: { count: 0, speed_bytes_per_sec: 0, items: [] },
  delayed: { count: 0 },
  attention: { count: 0, alerts: 0, gave_up: 0 },
  rss: { last_run_at: null, ok: null, releases_found: null, next_run_at: null },
  reencode: { active: 0, queued: 0 },
};
mock.module("@rawkoon/api/services/dashboardPipeline", () => ({
  buildDashboardPipeline: async () => payload,
}));

const { dashboardPipelineRoutes } = await import("./index");
const app = new Hono().route("/api/dashboard", dashboardPipelineRoutes);

describe("GET /api/dashboard/pipeline", () => {
  it("returns the pipeline to an admin", async () => {
    user = { id: "a", is_admin: true };
    const res = await app.request("/api/dashboard/pipeline");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
  });

  it("rejects a non-admin with 403", async () => {
    user = { id: "u", is_admin: false };
    expect((await app.request("/api/dashboard/pipeline")).status).toBe(403);
  });

  it("rejects an anonymous caller with 401", async () => {
    user = null;
    expect((await app.request("/api/dashboard/pipeline")).status).toBe(401);
  });
});
