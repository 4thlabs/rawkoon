import Foundation
@testable import Rawkoon
import Testing

struct ChapterDownloaderSplitRegressionTests {
    @Test func sessionIdentifierRoundTripsTheEdition() {
        let identifier = ChapterDownloader.sessionIdentifier(editionId: 42)
        #expect(identifier == "cloud.samlo.rawkoon.dl.42")
        #expect(ChapterDownloader.editionId(fromSessionIdentifier: identifier) == 42)
        #expect(ChapterDownloader.editionId(fromSessionIdentifier: "other.42") == nil)
    }

    @Test func sha256HexIsLowercaseAndNilWhenUnreadable() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("chapter-sha-\(UUID().uuidString)")
        try Data("abc".utf8).write(to: url)
        defer { try? FileManager.default.removeItem(at: url) }

        #expect(ChapterDownloader.sha256Hex(of: url) == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        #expect(ChapterDownloader.sha256Hex(of: url.appendingPathExtension("missing")) == nil)
    }
}
