import { APP_PATHS } from "../constants/appPaths";

const LEGACY_NOTIFICATION_PATHS: Record<string, string> = {
  "/medias": APP_PATHS.library,
  "/requests": APP_PATHS.activityRequests,
  "/watchlist": APP_PATHS.findWatchlist,
  "/notifications": APP_PATHS.activity,
  "/calendar": APP_PATHS.activityCalendar,
};

/** Old `/settings?tab=` links still stored on past notifications. */
const LEGACY_SETTINGS_TABS: Record<string, string> = {
  releases: APP_PATHS.settingsUpdates,
  transcode: APP_PATHS.settingsReencode,
  notifications: APP_PATHS.settingsAlerts,
};

function hasScheme(url: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url);
}

function normalizePathname(pathname: string): string {
  const trimmed =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return LEGACY_NOTIFICATION_PATHS[trimmed] ?? pathname;
}

/**
 * Maps pre-restructure in-app paths to their current ones. An absolute URL is
 * only rewritten when it points at `appOrigin`; anything else is left as is.
 */
export function normalizeNotificationUrl(
  url: string | null | undefined,
  appOrigin?: string,
): string | null {
  if (!url) return null;

  try {
    const raw = url.trim();
    if (!raw) return null;

    const isAbsolute = hasScheme(raw);
    const parsed = new URL(raw, "https://rawkoon.local");
    if (
      isAbsolute &&
      (!appOrigin || parsed.origin !== new URL(appOrigin).origin)
    ) {
      return raw;
    }

    const legacySettings =
      parsed.pathname.replace(/\/$/, "") === "/settings"
        ? LEGACY_SETTINGS_TABS[parsed.searchParams.get("tab") ?? ""]
        : undefined;
    if (legacySettings) {
      parsed.pathname = legacySettings;
      parsed.searchParams.delete("tab");
    } else {
      parsed.pathname = normalizePathname(parsed.pathname);
    }

    if (isAbsolute) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

/** Deep-link into a library item, optionally focusing a TV season/episode. */
export function buildLibraryNotificationUrl(
  mediaId: number,
  opts?: {
    season?: number | null;
    episode?: number | null;
    tab?: "files";
  },
): string {
  return buildNotificationUrl(`${APP_PATHS.library}/${mediaId}`, {
    tab: opts?.tab ?? "files",
    season: opts?.season ?? undefined,
    episode: opts?.episode ?? undefined,
  });
}

export function buildNotificationUrl(
  pathname: string,
  search?: Record<string, string | number | boolean | null | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(search ?? {})) {
    if (value == null || value === "") continue;
    params.set(key, String(value));
  }

  const normalizedPath = normalizePathname(pathname);
  const query = params.toString();
  return query ? `${normalizedPath}?${query}` : normalizedPath;
}
