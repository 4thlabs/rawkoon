import Foundation
@testable import Rawkoon
import RawkoonKit
import Testing

@MainActor
struct ContinueListeningSplitRegressionTests {
    @Test func buildKeepsInProgressItemsNewestFirst() {
        let library = [book(id: 1, audio: 10, ebook: nil), book(id: 2, audio: nil, ebook: 20)]
        let items = ContinueItem.build(
            audiobookProgress: [audio(edition: 10, position: 30, total: 100, finished: false, at: 100)],
            ebookProgress: [ebook(edition: 20, spine: 2, scroll: 0.5, finished: false, millis: 200_000)],
            library: library
        )
        #expect(items.map(\.id) == ["ebook-20", "audiobook-10"])
    }

    @Test func buildSkipsFinishedUnstartedAndUnknownEditions() {
        let library = [book(id: 1, audio: 10, ebook: 20)]
        let items = ContinueItem.build(
            audiobookProgress: [
                audio(edition: 10, position: 30, total: 100, finished: true, at: 1),
                audio(edition: 10, position: 1, total: 100, finished: false, at: 1),
                audio(edition: 99, position: 30, total: 100, finished: false, at: 1),
            ],
            ebookProgress: [
                ebook(edition: 20, spine: 0, scroll: 0.01, finished: false, millis: 1000),
                ebook(edition: 20, spine: 3, scroll: 0.5, finished: true, millis: 1000),
            ],
            library: library
        )
        #expect(items.isEmpty)
    }

    private func book(id: Int, audio: Int?, ebook: Int?) -> BookListItem {
        BookListItem(
            bookId: id, title: "Novel", author: nil, coverURL: nil,
            audiobookEditionId: audio, ebookEditionId: ebook,
            audiobookDurationSecs: nil, audiobookStatus: nil,
            audiobookFileCount: 0, hasEbook: ebook != nil, readAt: nil
        )
    }

    private func audio(edition: Int, position: Double, total: Double, finished: Bool, at: Double) -> RemoteProgress {
        RemoteProgress(
            editionId: edition, positionSecs: position, totalDurationSecs: total,
            finished: finished, updatedAt: Date(timeIntervalSince1970: at)
        )
    }

    private func ebook(edition: Int, spine: Int, scroll: Double, finished: Bool, millis: Int64) -> ReadingPosition {
        ReadingPosition(
            editionId: edition, fileId: nil, spineIndex: spine, spinePath: "a.xhtml", spineCount: 5,
            scrollFraction: scroll, finished: finished, updatedAtMillis: millis, locator: nil
        )
    }
}
