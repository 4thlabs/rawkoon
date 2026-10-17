import Foundation

/// Dashboard pipeline response decoded with the API client's snake_case decoder.
public struct DashboardPipeline: Codable, Sendable {
    public struct DownloadItem: Codable, Identifiable, Sendable {
        public let id: Int
        public let libraryMediaId: Int?
        public let bookId: Int?
        public let title: String
        public let progress: Double
        public let etaSeconds: Int?
    }

    public struct Downloading: Codable, Sendable {
        public let available: Bool
        public let count: Int
        public let speedBytesPerSec: Double
        public let items: [DownloadItem]
    }

    public struct Delayed: Codable, Sendable {
        public let available: Bool
        public let count: Int
    }

    public struct Attention: Codable, Sendable {
        public let available: Bool
        public let count: Int
        public let alerts: Int
        public let gaveUp: Int
    }

    public struct RSS: Codable, Sendable {
        public let available: Bool
        public let lastRunAt: String?
        public let ok: Bool?
        public let releasesFound: Int?
        public let nextRunAt: String?
    }

    public struct Reencode: Codable, Sendable {
        public let available: Bool
        public let active: Int
        public let queued: Int
    }

    public let downloading: Downloading
    public let delayed: Delayed
    public let attention: Attention
    public let rss: RSS
    public let reencode: Reencode
}
