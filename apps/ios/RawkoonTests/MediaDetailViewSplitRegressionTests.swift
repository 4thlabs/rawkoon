import Foundation
@testable import Rawkoon
import Testing

@MainActor
struct MediaDetailViewSplitRegressionTests {
    @Test func metaLineWithoutDetailsIsEmptyForMovies() {
        let view = makeView(mediaType: "movie")
        #expect(view.metaLine.isEmpty)
        #expect(view.yearValue == nil)
    }

    @Test func tvMetaLineWithoutDetailsShowsZeroSeasons() {
        let view = makeView(mediaType: "tv")
        #expect(view.metaLine == String(localized: "\(0) seasons"))
        #expect(view.yearValue == nil)
    }

    private func makeView(mediaType: String) -> MediaDetailView {
        MediaDetailView(tmdbId: 1, mediaType: mediaType, title: "T", posterPath: nil, libraryId: nil)
    }
}
