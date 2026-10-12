import Foundation
import RawkoonKit

struct ContinueAudiobookItem: Identifiable {
    let editionId: Int
    let title: String
    let author: String?
    let coverURL: URL?
    let positionSecs: Double
    let totalDurationSecs: Double
    let updatedAt: Date
    var id: String {
        "audiobook-\(editionId)"
    }
}

struct ContinueEbookItem: Identifiable {
    let editionId: Int
    let bookId: Int
    let title: String
    let author: String?
    let coverURL: URL?
    let fileId: Int?
    let spineIndex: Int
    let spinePath: String
    let spineCount: Int
    let scrollFraction: Double
    let updatedAt: Date
    var id: String {
        "ebook-\(editionId)"
    }
}

enum ContinueItem: Identifiable {
    case audiobook(ContinueAudiobookItem)
    case ebook(ContinueEbookItem)

    var id: String {
        switch self {
        case let .audiobook(audiobook): audiobook.id
        case let .ebook(ebook): ebook.id
        }
    }

    var updatedAt: Date {
        switch self {
        case let .audiobook(audiobook): audiobook.updatedAt
        case let .ebook(ebook): ebook.updatedAt
        }
    }
}

extension ContinueItem {
    static func build(
        audiobookProgress: [RemoteProgress],
        ebookProgress: [ReadingPosition],
        library: [BookListItem]
    ) -> [ContinueItem] {
        var built: [ContinueItem] = []

        let audiobooksByEdition = Dictionary(
            uniqueKeysWithValues: library.compactMap { book -> (Int, BookListItem)? in
                guard let editionId = book.audiobookEditionId else { return nil }
                return (editionId, book)
            }
        )
        for progress in audiobookProgress {
            guard !progress.finished else { continue }
            guard progress.positionSecs > 1, progress.totalDurationSecs > 1 else { continue }
            guard let book = audiobooksByEdition[progress.editionId] else { continue }
            built.append(
                .audiobook(
                    ContinueAudiobookItem(
                        editionId: progress.editionId,
                        title: book.title,
                        author: book.author,
                        coverURL: book.coverURL,
                        positionSecs: progress.positionSecs,
                        totalDurationSecs: progress.totalDurationSecs,
                        updatedAt: progress.updatedAt
                    )
                )
            )
        }

        let ebooksByEdition = Dictionary(
            uniqueKeysWithValues: library.compactMap { book -> (Int, BookListItem)? in
                guard let editionId = book.ebookEditionId else { return nil }
                return (editionId, book)
            }
        )
        for progress in ebookProgress {
            guard !progress.finished else { continue }
            guard progress.spineIndex > 0 || progress.scrollFraction > 0.01 else { continue }
            guard let book = ebooksByEdition[progress.editionId] else { continue }
            built.append(
                .ebook(
                    ContinueEbookItem(
                        editionId: progress.editionId,
                        bookId: book.bookId,
                        title: book.title,
                        author: book.author,
                        coverURL: book.coverURL,
                        fileId: progress.fileId,
                        spineIndex: progress.spineIndex,
                        spinePath: progress.spinePath,
                        spineCount: progress.spineCount,
                        scrollFraction: progress.scrollFraction,
                        updatedAt: Date(timeIntervalSince1970: Double(progress.updatedAtMillis) / 1000)
                    )
                )
            )
        }

        return built.sorted { $0.updatedAt > $1.updatedAt }
    }
}
