import Foundation
@testable import Rawkoon
import RawkoonKit
import Testing

@MainActor
struct AudiobookPlayerSplitRegressionTests {
    @Test func loadingANewBookClearsSessionStateAndUnloadForgetsIt() throws {
        let player = AudiobookPlayer()
        player.pausedAt = Date(timeIntervalSince1970: 1)
        player.playbackError = "Old error"
        player.recoveredFileIds = [9]
        player.streamRetriedAt = [9: Date(timeIntervalSince1970: 2)]

        let manifest = BookManifest(
            editionId: 77, bookId: 4, title: "Book", authors: [],
            totalDurationSecs: 100, files: [], chapters: []
        )
        try player.load(manifest: manifest, baseURL: #require(URL(string: "https://example.test")), resumeAt: 20)

        #expect(player.manifest?.editionId == 77)
        #expect(player.playbackError == nil)
        #expect(player.pausedAt == nil)
        #expect(player.recoveredFileIds.isEmpty)
        #expect(player.streamRetriedAt.isEmpty)
        #expect(player.isPlaying == false)

        player.unload()

        #expect(player.manifest == nil)
        #expect(player.player == nil)
        #expect(player.chapters.isEmpty)
        #expect(player.positionSecs == 0)
        #expect(player.duration == 0)
        #expect(player.currentChapter == nil)
    }
}
