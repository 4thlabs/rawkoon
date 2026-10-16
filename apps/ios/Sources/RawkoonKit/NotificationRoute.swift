import Foundation

/// Where a notification's `url` points, parsed from the web SPA path the server
/// emits. Pure so the path table is unit-tested on Linux; the app maps each
/// case to a screen. Anything the app has no screen for parses to nil. Paths
/// from before the restructure still resolve, so already-delivered pushes and
/// an older server keep working.
public enum NotificationRoute: Equatable, Sendable {
    /// `/library/{id}`, optionally `?season=&episode=&tab=management`.
    case media(libraryId: Int, season: Int?, episode: Int?, focusManagement: Bool)
    /// `/books/{id}`.
    case book(bookId: Int)
    /// `/activity` (the inbox itself), or the old `/notifications`.
    case inbox
    /// `/activity/requests`, or the old `/requests`.
    case requests
    /// `/activity/calendar`, optionally `?date=`, or the old `/calendar`.
    case calendar(date: String?)
    /// `/find/watchlist`, or the old `/watchlist`.
    case watchlist
    /// `/settings/reencode`, or the old `/settings?tab=transcode`.
    case reencode
    /// `/settings/alerts`, or the old `/settings?tab=notifications`.
    case alerts
    /// `/settings/updates`, or the old `/settings?tab=releases`.
    case updates

    public static func parse(_ url: String?) -> NotificationRoute? {
        guard let url, !url.isEmpty, let components = URLComponents(string: url) else { return nil }
        let segments = components.path.split(separator: "/").map(String.init)
        guard let head = segments.first else { return nil }

        func query(_ name: String) -> String? {
            components.queryItems?.first(where: { $0.name == name })?.value
        }

        switch (head, segments.dropFirst().first) {
        case let ("library", id?):
            return Int(id).map {
                .media(
                    libraryId: $0, season: query("season").flatMap(Int.init),
                    episode: query("episode").flatMap(Int.init), focusManagement: query("tab") == "management"
                )
            }
        case let ("books", id?):
            return Int(id).map { .book(bookId: $0) }
        case ("activity", nil), ("notifications", nil): return .inbox
        case ("activity", "requests"), ("requests", nil): return .requests
        case ("activity", "calendar"), ("calendar", nil): return .calendar(date: query("date"))
        case ("find", "watchlist"), ("watchlist", nil): return .watchlist
        case ("settings", "reencode"): return .reencode
        case ("settings", "alerts"): return .alerts
        case ("settings", "updates"): return .updates
        case ("settings", nil): return legacySettings(tab: query("tab"))
        default: return nil
        }
    }

    /// The old `/settings?tab=` links still stored on past notifications.
    private static func legacySettings(tab: String?) -> NotificationRoute? {
        switch tab {
        case "transcode": .reencode
        case "notifications": .alerts
        case "releases": .updates
        default: nil
        }
    }
}
