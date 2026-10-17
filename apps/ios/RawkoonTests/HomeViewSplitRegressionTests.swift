import Foundation
@testable import Rawkoon
import Testing

@MainActor
struct HomeViewSplitRegressionTests {
    private let card = LibraryStatsCard(stats: LibraryStats(
        totalMovies: 0, totalShows: 0, downloaded: 0, wanted: 0, returningSeries: 0,
        storageUsedBytes: 0, diskTotalBytes: nil, diskFreeBytes: nil, storageByResolution: []
    ))

    @Test func resolutionRankOrdersLowToHighWithUnknownLast() {
        #expect(["unknown", "4k", "480p", "1080p", "720p"].sorted { card.resolutionRank($0) < card.resolutionRank($1) }
            == ["480p", "720p", "1080p", "4k", "unknown"])
    }

    @Test func resolutionLabelFormatsKnownBuckets() {
        #expect(card.resolutionLabel("4k") == "4K")
        #expect(card.resolutionLabel("1080p") == "1080p")
    }

    @Test func byteStringClampsNegativeValues() {
        #expect(card.byteString(-5) == card.byteString(0))
    }

    @Test func storageBarsDropEmptyRowsAndSortByResolution() throws {
        let json = #"""
        [{"resolution":"4k","sizeBytes":10},{"resolution":"720p","sizeBytes":0},{"resolution":"480p","sizeBytes":3}]
        """#
        let rows = try JSONDecoder().decode([StorageByResolution].self, from: Data(json.utf8))
        #expect(card.orderedStorageBars(rows).map(\.resolution) == ["480p", "4k"])
    }
}
