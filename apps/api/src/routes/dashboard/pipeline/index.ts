import { Hono } from "hono";
import { ok } from "@rawkoon/api/errors";
import type { Env } from "@rawkoon/api/honoEnv";
import { requireAdmin } from "@rawkoon/api/middleware/hono/auth";
import { buildDashboardPipeline } from "@rawkoon/api/services/dashboardPipeline";

// Route-level guard: a `.use('*')` here would leak across the .route() merges.
export const dashboardPipelineRoutes = new Hono<Env>().get(
  "/pipeline",
  requireAdmin,
  async () => ok(await buildDashboardPipeline()),
);
