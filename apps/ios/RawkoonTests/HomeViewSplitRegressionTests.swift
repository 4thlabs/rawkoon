import Foundation
@testable import Rawkoon
import Testing

@MainActor
struct HomeViewSplitRegressionTests {
    @Test func resolutionRankOrdersLowToHighWithUnknownLast() {
        let view = HomeView()
        #expect(["unknown", "4k", "480p", "1080p", "720p"].sorted { view.resolutionRank($0) < view.resolutionRank($1) }
            == ["480p", "720p", "1080p", "4k", "unknown"])
    }

    @Test func resolutionLabelFormatsKnownBuckets() {
        let view = HomeView()
        #expect(view.resolutionLabel("4k") == "4K")
        #expect(view.resolutionLabel("1080p") == "1080p")
    }

    @Test func byteStringClampsNegativeValues() {
        let view = HomeView()
        #expect(view.byteString(-5) == view.byteString(0))
    }

    @Test func storageBarsDropEmptyRowsAndSortByResolution() throws {
        let json = #"""
        [{"resolution":"4k","sizeBytes":10},{"resolution":"720p","sizeBytes":0},{"resolution":"480p","sizeBytes":3}]
        """#
        let rows = try JSONDecoder().decode([StorageByResolution].self, from: Data(json.utf8))
        #expect(HomeView().orderedStorageBars(rows).map(\.resolution) == ["480p", "4k"])
    }
}
