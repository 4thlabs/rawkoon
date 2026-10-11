import RawkoonKit
import SwiftUI

/// Filter state for `ExploreView` / `ExploreFilterSheet`. Provider and genre
/// hold the full TMDB object (not just an id) so the active-filter chip row
/// can show a name without a second lookup.
struct ExploreFilters: Equatable {
    enum Kind: String, CaseIterable, Identifiable, Sendable {
        case movie
        case tv

        var id: String {
            rawValue
        }

        var apiValue: String {
            rawValue
        }

        var label: LocalizedStringKey {
            switch self {
            case .movie: "Movies"
            case .tv: "TV"
            }
        }
    }

    var kind: Kind = .movie
    var provider: StreamingProvider?
    var genre: Genre?
    var sort: DiscoverSort = .popularityDesc
    var originalLanguageOnly = false

    init(kind: Kind = .movie) {
        self.kind = kind
    }

    /// Whether every filter but `kind` is at its default — drives the sheet's
    /// Reset button and whether the chip row has anything to show.
    var isDefault: Bool {
        provider == nil && genre == nil && sort == .popularityDesc && !originalLanguageOnly
    }
}
