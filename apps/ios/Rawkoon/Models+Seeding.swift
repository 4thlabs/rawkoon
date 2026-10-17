import Foundation
import RawkoonKit

// Sharing (seeding) rules — `GET/PUT/DELETE /api/downloads/seed-rules` and the
// preview on `GET /api/downloads/seeding?preview=1`. Split out of Models+Settings
// to stay under the file_length lint.

nonisolated struct SeedRuleDTO: Decodable, Equatable, Sendable {
    let ratio: Double?
    let seedTimeMins: Int?

    var rule: SeedRule {
        SeedRule(ratio: ratio, seedTimeMins: seedTimeMins)
    }
}

nonisolated struct IndexerSeedRuleRowDTO: Decodable, Identifiable, Sendable {
    let indexer: String
    let isPrivate: Bool
    let override: SeedRuleDTO?
    let effective: SeedRuleDTO
    let heldCount: Int

    var id: String {
        indexer
    }
}

nonisolated struct SeedRulesResponseDTO: Decodable, Sendable {
    let indexers: [IndexerSeedRuleRowDTO]
}

/// Only what the settings screen needs from the seeding list: the sweep switch,
/// how many torrents are held, and what one sweep would release now.
nonisolated struct SeedingPreviewDTO: Decodable, Sendable {
    struct Held: Decodable, Sendable {
        let hash: String
    }

    struct WouldRelease: Decodable, Sendable {
        let count: Int
        let bytes: Int64
    }

    let enabled: Bool
    let torrents: [Held]
    let wouldReleaseNow: WouldRelease?
}

/// Per-indexer override. Explicit JSON null for a cleared target, so the server
/// stores "no target" instead of keeping the old value.
nonisolated struct UpsertSeedRuleBody: Encodable, Sendable {
    var ratio: Double?
    var seedTimeMins: Int?

    enum CodingKeys: String, CodingKey {
        case ratio, seedTimeMins
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(ratio, forKey: .ratio)
        try c.encode(seedTimeMins, forKey: .seedTimeMins)
    }
}

/// Sharing subset of the shared post-processing row: each target is a ratio, a time, or both
/// (whichever comes first), plus the download-safety settings. `minSeedRatio` 0 is the public
/// "no ratio target"; an explicit JSON null clears a time or private-ratio target.
nonisolated struct UpdateSeedSettingsBody: Encodable, Sendable {
    var seedSweepEnabled: Bool
    var minSeedRatio: Double
    var publicSeedTimeMins: Int?
    var privateSeedRatio: Double?
    var privateSeedTimeMins: Int?
    var blockedExtensions: [String]
    var minFreeSpaceGb: Int?

    enum CodingKeys: String, CodingKey {
        case seedSweepEnabled, minSeedRatio, publicSeedTimeMins, privateSeedRatio, privateSeedTimeMins
        case blockedExtensions, minFreeSpaceGb
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(seedSweepEnabled, forKey: .seedSweepEnabled)
        try c.encode(minSeedRatio, forKey: .minSeedRatio)
        try c.encode(publicSeedTimeMins, forKey: .publicSeedTimeMins)
        try c.encode(privateSeedRatio, forKey: .privateSeedRatio)
        try c.encode(privateSeedTimeMins, forKey: .privateSeedTimeMins)
        try c.encode(blockedExtensions, forKey: .blockedExtensions)
        try c.encodeIfPresent(minFreeSpaceGb, forKey: .minFreeSpaceGb)
    }
}

/// Reply of `POST /api/transcode/jobs/:id/free-source`.
nonisolated struct TranscodeFreeSourceDTO: Decodable, Sendable {
    let torrents: Int
    let freedBytes: Int64
    let skipped: Int
}

/// Reply of `GET /api/transcode/jobs/:id/free-source`.
nonisolated struct TranscodeFreeSourcePreviewDTO: Decodable, Sendable {
    let torrents: Int
    let privateUnmet: Int
}
