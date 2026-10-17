import { describe, expect, it } from "bun:test";
import { APP_PATHS } from "../../constants";
import {
  buildLibraryNotificationUrl,
  buildNotificationUrl,
  normalizeNotificationUrl,
} from "../notifications";

const ORIGIN = "https://rawkoon.example";

describe("normalizeNotificationUrl", () => {
  it("maps stored pre-restructure paths to the new ones", () => {
    expect(normalizeNotificationUrl("/requests")).toBe("/activity/requests");
    expect(normalizeNotificationUrl("/watchlist")).toBe("/find/watchlist");
    expect(normalizeNotificationUrl("/notifications")).toBe("/activity");
    expect(normalizeNotificationUrl("/settings?tab=releases")).toBe(
      "/settings/updates",
    );
    expect(normalizeNotificationUrl("/settings?tab=transcode")).toBe(
      "/settings/reencode",
    );
    expect(normalizeNotificationUrl("/settings?tab=notifications")).toBe(
      "/settings/alerts",
    );
  });

  it("handles a trailing slash, extra query params and a hash", () => {
    expect(normalizeNotificationUrl("/requests/")).toBe("/activity/requests");
    expect(normalizeNotificationUrl("/requests?x=1#top")).toBe(
      "/activity/requests?x=1#top",
    );
    expect(normalizeNotificationUrl("/settings?tab=releases&x=1#h")).toBe(
      "/settings/updates?x=1#h",
    );
  });

  it("leaves new paths and item links alone", () => {
    expect(normalizeNotificationUrl("/library/4?tab=files")).toBe(
      "/library/4?tab=files",
    );
    expect(normalizeNotificationUrl(APP_PATHS.settingsAlerts)).toBe(
      "/settings/alerts",
    );
  });

  it("rewrites an absolute URL only on the app origin", () => {
    expect(normalizeNotificationUrl(`${ORIGIN}/requests`, ORIGIN)).toBe(
      `${ORIGIN}/activity/requests`,
    );
    expect(
      normalizeNotificationUrl("https://other.example/requests", ORIGIN),
    ).toBe("https://other.example/requests");
    expect(normalizeNotificationUrl(`${ORIGIN}/requests`)).toBe(
      `${ORIGIN}/requests`,
    );
  });
});

describe("app paths", () => {
  it("builds watchlist and library links", () => {
    expect(buildNotificationUrl(APP_PATHS.findWatchlist)).toBe(
      "/find/watchlist",
    );
  });
});

describe("buildLibraryNotificationUrl", () => {
  it("opens the Files tab, optionally on a season and episode", () => {
    expect(buildLibraryNotificationUrl(7)).toBe("/library/7?tab=files");
    expect(buildLibraryNotificationUrl(7, { season: 2, episode: 5 })).toBe(
      "/library/7?tab=files&season=2&episode=5",
    );
  });
});
