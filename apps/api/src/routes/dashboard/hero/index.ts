import { Hono } from "hono";
import { normalizeTitleLanguage } from "@rawkoon/shared/constants";
import type { DashboardHeroResponse } from "@rawkoon/shared/types";
import { ok, serverError } from "@rawkoon/api/errors";
import type { Env } from "@rawkoon/api/honoEnv";
import { requireUser } from "@rawkoon/api/middleware/hono/auth";
import { getJsonCache, setJsonCache } from "@rawkoon/api/services/cache";
import { buildHomeHero } from "@rawkoon/api/services/homeHero";
import { createHomeHeroDeps } from "@rawkoon/api/services/homeHeroDeps";

const HERO_CACHE_TTL_SECONDS = 60;

export const dashboardHeroRoutes = new Hono<Env>()
  .use("*", requireUser)
  .get("/hero", async (c) => {
    try {
      const userId = c.get("user").id;
      const titleLanguage = normalizeTitleLanguage(
        c.req.query("title_language"),
      );
      const cacheKey = `dashboard:hero:v1:${userId}:${titleLanguage}`;

      const cached = await getJsonCache<DashboardHeroResponse>(cacheKey);
      if (cached) return ok(cached);

      const payload = await buildHomeHero(
        createHomeHeroDeps(userId, titleLanguage),
      );
      await setJsonCache(cacheKey, payload, HERO_CACHE_TTL_SECONDS);
      return ok(payload);
    } catch (error) {
      console.error("Error building home hero:", error);
      return serverError("Failed to build home hero");
    }
  });
