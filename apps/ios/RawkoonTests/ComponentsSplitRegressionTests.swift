@testable import Rawkoon
import Testing

@MainActor
struct ComponentsSplitRegressionTests {
    @Test func bookConfirmationsKeepDistinctActions() {
        let book = BookListItem(
            bookId: 42, title: "Novel", author: nil, coverURL: nil,
            audiobookEditionId: 7, ebookEditionId: nil,
            audiobookDurationSecs: nil, audiobookStatus: nil,
            audiobookFileCount: 0, hasEbook: false, readAt: nil
        )

        #expect(PendingBookConfirm.markRead(book).id == "read-42")
        #expect(PendingBookConfirm.resetProgress(book).id == "reset-42")
        #expect(PendingBookConfirm.removeDownload(book).id == "remove-42")
        #expect(PendingBookConfirm.markRead(book).title != PendingBookConfirm.resetProgress(book).title)
        #expect(PendingBookConfirm.resetProgress(book).message != PendingBookConfirm.removeDownload(book).message)
    }

    @Test func releaseSearchPresentationIdentityIncludesMediaAndLibraryContext() {
        let movie = ReleaseSearchPresentation(query: "Novel", libraryMediaId: 3, tmdbId: 42, mediaType: "movie")
        let show = ReleaseSearchPresentation(query: "Novel", libraryMediaId: 3, tmdbId: 42, mediaType: "tv")
        let explore = ReleaseSearchPresentation(query: "Novel", libraryMediaId: nil, tmdbId: 42, mediaType: "movie")

        #expect(movie.id != show.id)
        #expect(movie.id != explore.id)
    }
}
