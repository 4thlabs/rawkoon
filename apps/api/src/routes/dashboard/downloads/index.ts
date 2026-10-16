import { Hono } from "hono";
import { resolveActiveAdapter } from "@rawkoon/api/services/downloadClient/registry";
import { ok, serverError } from "@rawkoon/api/errors";
import {
  buildActiveDownloads,
  buildProgressSummary,
  loadActiveGrabRows,
} from "@rawkoon/api/services/downloads/activeDownloads";
import type { Env } from "@rawkoon/api/honoEnv";
import { requireAdmin, requireUser } from "@rawkoon/api/middleware/hono/auth";

export const dashboardDownloadsRoutes = new Hono<Env>()
  .use("*", requireUser)
  .get("/downloads/speed", async () => {
    const active = await resolveActiveAdapter();
    if (!active) {
      return ok({ enabled: false, connected: false, dl_speed: 0, ul_speed: 0 });
    }

    try {
      const torrents = await active.adapter.listTorrents();
      return ok({
        enabled: true,
        connected: true,
        dl_speed: torrents.reduce(
          (total, torrent) => total + Math.max(0, torrent.dlSpeed),
          0,
        ),
        ul_speed: 0,
      });
    } catch {
      return ok({ enabled: true, connected: false, dl_speed: 0, ul_speed: 0 });
    }
  })
  // Titles and release names are admin-only; a per-route guard because .use('*') leaks across .route() merges.
  .get("/downloads/active", requireAdmin, async () => {
    const active = await resolveActiveAdapter();
    if (!active) return ok({ enabled: false, connected: false, items: [] });

    try {
      const [rows, torrents] = await Promise.all([
        loadActiveGrabRows(),
        active.adapter.listTorrents().catch(() => null),
      ]);
      if (!torrents) return ok({ enabled: true, connected: false, items: [] });
      return ok({
        enabled: true,
        connected: true,
        items: buildActiveDownloads(rows, torrents),
      });
    } catch {
      return serverError("Failed to load active downloads");
    }
  })
  // Percent only, for the status chips every signed-in user sees.
  .get("/downloads/progress", requireUser, async () => {
    const active = await resolveActiveAdapter();
    if (!active) return ok({ items: [] });
    try {
      const [rows, torrents] = await Promise.all([
        loadActiveGrabRows(),
        active.adapter.listTorrents().catch(() => []),
      ]);
      return ok({ items: buildProgressSummary(rows, torrents) });
    } catch {
      return serverError("Failed to load download progress");
    }
  });
