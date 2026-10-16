import RawkoonKit
import SwiftUI

extension RootTab {
    var symbol: String {
        switch self {
        case .home: "house"
        case .library: "film.stack"
        case .books: "books.vertical"
        case .find: "magnifyingglass"
        case .settings: "gearshape"
        case .activity: "tray.full"
        case .server: "server.rack"
        }
    }

    var selectedSymbol: String {
        self == .settings ? symbol : symbol + ".fill"
    }

    var title: LocalizedStringKey {
        switch self {
        case .home: "Home"
        case .library: "Media"
        case .books: "Books"
        case .find: "Find"
        case .settings: "Settings"
        case .activity: "Activity"
        case .server: "Server"
        }
    }

    /// Sidebar and menu label: the phone bar abbreviates Movies & Shows to fit.
    var sidebarTitle: LocalizedStringKey {
        switch self {
        case .library: "Movies & Shows"
        case .settings: "Preferences"
        default: title
        }
    }
}
