/** Web app paths the server embeds in notifications and links. */
export const APP_PATHS = {
  activity: "/activity",
  activityRequests: "/activity/requests",
  activityCalendar: "/activity/calendar",
  settingsAlerts: "/settings/alerts",
  settingsReencode: "/settings/reencode",
  settingsUpdates: "/settings/updates",
  findWatchlist: "/find/watchlist",
  library: "/library",
  books: "/books",
} as const;

export function calendarPath(date?: string | null): string {
  return date
    ? `${APP_PATHS.activityCalendar}?date=${encodeURIComponent(date)}`
    : APP_PATHS.activityCalendar;
}
