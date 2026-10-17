/// The app's top-level destinations. Raw values are the tab tags persisted in
/// selection state, so they must not change; tabs that no longer exist map to
/// their new home through `migrated(_:)`.
public enum RootTab: String, CaseIterable, Sendable {
    case home, library, books, find, activity, settings, server

    /// The custom iPhone bar, left to right. Settings is the avatar slot.
    public static let phone: [RootTab] = [.home, .library, .books, .find, .activity, .settings]

    /// The iPad/Mac sidebar, in display order (SwiftUI lists loose tabs above
    /// sections, so Library and Settings come after Home, Find and Activity).
    /// `server` is admin-only; see `visibleSidebar`.
    public static let sidebar: [RootTab] = [.home, .find, .activity, .library, .books, .settings, .server]

    /// Raw values of tabs that were removed, and where their content lives now.
    private static let retired: [String: RootTab] = [
        "discover": .find, "explore": .find, "watchlist": .find,
        "notifications": .activity, "requests": .activity,
    ]

    /// The phone bar as it shows when the server's books feature is on or off.
    public static func phoneTabs(booksEnabled: Bool) -> [RootTab] {
        phone.filter { $0 != .books || booksEnabled }
    }

    /// The sidebar entries this user can see.
    public static func visibleSidebar(isAdmin: Bool, booksEnabled: Bool = true) -> [RootTab] {
        sidebar.filter { ($0 != .server || isAdmin) && ($0 != .books || booksEnabled) }
    }

    /// A stored tab id resolved to a tab that exists today: current ids as-is,
    /// retired ids to the tab that absorbed them, anything else nil.
    public static func migrated(_ raw: String) -> RootTab? {
        RootTab(rawValue: raw) ?? retired[raw]
    }

    /// A stale pick must resolve to a tab that exists at this width; Home is the landing tab.
    public static func validated(_ raw: String, compact: Bool, isAdmin: Bool = true, booksEnabled: Bool = true) -> RootTab {
        let available = compact ? phoneTabs(booksEnabled: booksEnabled)
            : visibleSidebar(isAdmin: isAdmin, booksEnabled: booksEnabled)
        guard let tab = migrated(raw), available.contains(tab) else { return .home }
        return tab
    }

    /// The debug `RAWKOON_TAB` value: a tab name, or one of the five indices
    /// screenshot scripts used before the custom bar, with their old meaning
    /// (index 3 was Discover, which now lives in Find).
    public static func debugSelection(_ raw: String) -> RootTab? {
        if let tab = migrated(raw) {
            return tab
        }
        let legacy: [RootTab] = [.home, .library, .books, .find, .settings]
        guard let index = Int(raw), legacy.indices.contains(index) else { return nil }
        return legacy[index]
    }
}
