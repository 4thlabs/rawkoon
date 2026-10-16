import Foundation

/// Where a notification's `url` points, parsed from the web SPA path the server
/// emits. Pure so the path table is unit-tested on Linux; the app maps each
/// case to a screen. Anything the app has no screen for parses to nil.
public enum NotificationRoute: Equatable, Sendable {
    /// `/library/{id}`, optionally `?season=&episode=&tab=management`.
    case media(libraryId: Int, season: Int?, episode: Int?, focusManagement: Bool)
    /// `/books/{id}`.
    case book(bookId: Int)
    /// `/activity/requests`.
    case requests
    /// `/activity/calendar`, optionally `?date=`.
    case calendar(date: String?)
    /// `/settings/reencode`.
    case reencode
    /// `/settings/alerts`.
    case alerts
    /// `/settings/updates`.
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
        case ("activity", "requests"): return .requests
        case ("activity", "calendar"): return .calendar(date: query("date"))
        case ("settings", "reencode"): return .reencode
        case ("settings", "alerts"): return .alerts
        case ("settings", "updates"): return .updates
        default: return nil
        }
    }
}
