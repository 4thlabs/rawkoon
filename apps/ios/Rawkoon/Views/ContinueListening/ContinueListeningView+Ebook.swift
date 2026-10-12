import RawkoonKit
import SwiftUI

extension ContinueListeningView {
    func ebookDocument(for item: ContinueEbookItem) async throws -> EbookPreviewDocument {
        guard let client = model.api() else { throw APIError.unauthorized }

        let files = try await client.bookEditionFiles(bookId: item.bookId, kind: "ebook")
        guard !files.isEmpty else { throw APIError.http(404) }

        let selected =
            files.first(where: { $0.id == item.fileId })
                ?? files.min(by: { ebookFormatRank($0.format) < ebookFormatRank($1.format) })
                ?? files[0]

        let localURL = try await ensureLocalEbookFile(selected, editionId: item.editionId)
        let language = try? await client.bookDetail(bookId: item.bookId).language
        return EbookPreviewDocument(
            id: selected.id,
            editionId: item.editionId,
            language: language,
            title: item.title,
            localURL: localURL
        )
    }

    func ensureLocalEbookFile(_ file: BookEditionFile, editionId: Int) async throws -> URL {
        let localURL = FileStore.chapterURL(
            editionId: editionId,
            fileId: file.id,
            ext: ebookExtension(for: file)
        )
        if FileManager.default.fileExists(atPath: localURL.path) {
            return localURL
        }

        guard model.absoluteURL(file.contentUrl) != nil else {
            throw EbookContinueError.missingRemoteURL
        }

        let temporaryURL: URL
        do {
            // NOTE: deliberately surfacing .transport for every failure here to preserve
            // the shipping copy ("Network error…"). The 401→"Sign in required." wording
            // improvement is deferred to the localization phase — see the milestone spec.
            guard let client = model.api() else { throw APIError.unauthorized }
            temporaryURL = try await client.downloadFile(path: file.contentUrl ?? "")
        } catch {
            Log.network.error("openEbook download failed: \(String(describing: error), privacy: .public)")
            throw APIError.transport
        }

        let parent = localURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: parent, withIntermediateDirectories: true)
        if FileManager.default.fileExists(atPath: localURL.path) {
            try FileManager.default.removeItem(at: localURL)
        }
        try FileManager.default.moveItem(at: temporaryURL, to: localURL)
        return localURL
    }

    func ebookExtension(for file: BookEditionFile) -> String {
        let ext = URL(fileURLWithPath: file.fileName).pathExtension.lowercased()
        if !ext.isEmpty {
            return ext
        }
        let normalized = file.format.trimmingCharacters(in: CharacterSet(charactersIn: ".")).lowercased()
        return normalized.isEmpty ? "epub" : normalized
    }

    func ebookFormatRank(_ format: String) -> Int {
        switch format.lowercased() {
        case "epub": 0
        case "azw3": 1
        case "mobi": 2
        case "pdf": 3
        case "cbz": 4
        default: 99
        }
    }
}

enum EbookContinueError: Error {
    case missingRemoteURL
}
