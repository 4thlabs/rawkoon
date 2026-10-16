/// The app's top-level destinations. Raw values are the tab tags persisted in
/// selection state, so they must not change.
public enum RootTab: String, CaseIterable, Sendable {
    case home, library, books, discover, explore, notifications, settings
    case activity, requests, watchlist, server

    /// The custom iPhone bar, left to right.
    public static let phone: [RootTab] = [.home, .library, .books, .discover, .explore, .notifications, .settings]

    /// The iPad/Mac sidebar, in display order (SwiftUI lists loose tabs above
    /// sections). `server` is admin-only; see `visibleSidebar`.
    public static let sidebar: [RootTab] = [
        .home, .notifications, .library, .books, .watchlist, .discover, .explore,
        .activity, .requests, .settings, .server,
    ]

    /// The phone bar as it shows when the server's books feature is on or off.
    public static func phoneTabs(booksEnabled: Bool) -> [RootTab] {
        phone.filter { $0 != .books || booksEnabled }
    }

    /// The sidebar entries this user can see.
    public static func visibleSidebar(isAdmin: Bool, booksEnabled: Bool = true) -> [RootTab] {
        sidebar.filter { ($0 != .server || isAdmin) && ($0 != .books || booksEnabled) }
    }

    /// A stale pick must resolve to a tab that exists at this width; Home is the landing tab.
    public static func validated(_ raw: String, compact: Bool, isAdmin: Bool = true, booksEnabled: Bool = true) -> RootTab {
        let available = compact ? phoneTabs(booksEnabled: booksEnabled)
            : visibleSidebar(isAdmin: isAdmin, booksEnabled: booksEnabled)
        guard let tab = RootTab(rawValue: raw), available.contains(tab) else { return .home }
        return tab
    }

    /// The debug `RAWKOON_TAB` value: a tab name, or one of the five indices
    /// screenshot scripts used before the custom bar, with their old meaning.
    public static func debugSelection(_ raw: String) -> RootTab? {
        if let tab = RootTab(rawValue: raw) {
            return tab
        }
        let legacy: [RootTab] = [.home, .library, .books, .discover, .settings]
        guard let index = Int(raw), legacy.indices.contains(index) else { return nil }
        return legacy[index]
    }
}
