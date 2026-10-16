import { describe, expect, it } from "bun:test";
import { APP_PATHS, calendarPath } from "../../constants";
import {
  buildNotificationUrl,
  normalizeNotificationUrl,
} from "../notifications";

describe("normalizeNotificationUrl", () => {
  it("maps stored pre-restructure paths to the new ones", () => {
    expect(normalizeNotificationUrl("/requests")).toBe("/activity/requests");
    expect(normalizeNotificationUrl("/watchlist")).toBe("/find/watchlist");
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

  it("leaves new paths and item links alone", () => {
    expect(normalizeNotificationUrl("/library/4?tab=management")).toBe(
      "/library/4?tab=management",
    );
    expect(normalizeNotificationUrl(APP_PATHS.settingsAlerts)).toBe(
      "/settings/alerts",
    );
  });
});

describe("app paths", () => {
  it("builds calendar and watchlist links", () => {
    expect(calendarPath("2026-01-02")).toBe(
      "/activity/calendar?date=2026-01-02",
    );
    expect(calendarPath()).toBe("/activity/calendar");
    expect(buildNotificationUrl(APP_PATHS.findWatchlist)).toBe(
      "/find/watchlist",
    );
  });
});
