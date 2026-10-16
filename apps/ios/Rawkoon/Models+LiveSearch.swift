import Foundation
import RawkoonKit

/// `POST /api/library`: the created item plus what the server did about searching for it.
/// The search fields are optional so an older server still decodes.
nonisolated struct AddToLibraryResult: Decodable, Sendable {
    let item: LibraryMedia
    let searchQueued: Bool?
    let searchSkippedReason: String?
    let digitalReleaseDate: String?
}

nonisolated struct SearchReleaseDTO: Decodable, Sendable {
    let title: String
    let resolution: Int?
    let source: String?
    let sizeBytes: Int64?
}

/// A finished search, as returned inside a search call's response.
nonisolated struct SearchResultDTO: Decodable, Sendable {
    let mediaId: Int
    let season: Int?
    let outcome: String
    let release: SearchReleaseDTO?
    let delayUntil: String?
    let targetKey: String?
    let targetKeys: [String]?
    let reason: String?

    var result: LiveSearchResult? {
        LiveSearchResult.make(
            mediaId: mediaId, season: season, outcome: outcome, release: release,
            delayUntil: delayUntil, targetKey: targetKey, targetKeys: targetKeys, reason: reason
        )
    }
}

extension LiveSearchResult {
    /// Nil for an outcome this build does not know, so a newer server never shows a wrong toast.
    nonisolated static func make(
        mediaId: Int, season: Int?, outcome: String, release: SearchReleaseDTO?, delayUntil: String?,
        targetKey: String?, targetKeys: [String]?, reason: String?
    ) -> LiveSearchResult? {
        guard let outcome = LiveSearchOutcome(rawValue: outcome) else { return nil }
        let keys = targetKeys?.isEmpty == false ? targetKeys ?? [] : targetKey.map { [$0] } ?? []
        return LiveSearchResult(
            mediaId: mediaId, season: season, outcome: outcome, releaseTitle: release?.title,
            resolution: release?.resolution, source: release?.source, sizeBytes: release?.sizeBytes,
            delayUntil: delayUntil, targetKeys: keys, reason: reason
        )
    }
}

/// `POST /api/downloads/pending-releases/grab-now`.
nonisolated struct GrabPendingNowBody: Encodable, Sendable {
    let targetKey: String
}

nonisolated struct GrabPendingNowResponse: Decodable, Sendable {
    let grabbed: Bool
    let reason: String?
}
