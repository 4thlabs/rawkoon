import Foundation

// `GET /api/admin/library-health`: the latest library health run, for System > Health.

nonisolated struct LibraryHealthSummary: Decodable, Sendable {
    let totalIssues: Int?
    let downloadedMediaWithoutFiles: Int?
    let downloadedEpisodesWithoutFiles: Int?
    let missingFilePaths: Int?
    let downloadedBookEditionsWithoutFiles: Int?
    let missingBookFilePaths: Int?
    let staleTmdbStatuses: Int?
    let episodeNumberMismatches: Int?
    let episodeDurationMismatches: Int?
}

nonisolated struct LibraryHealthIssue: Decodable, Sendable {
    let kind: String?
    let mediaId: Int?
    let bookId: Int?
    let title: String?
    let detail: String
}

nonisolated struct LibraryHealthLog: Decodable, Sendable {
    let status: String
    let trigger: String?
    let startedAt: String?
    let completedAt: String?
    let summary: LibraryHealthSummary?
    let issues: [LibraryHealthIssue]?
    let warnings: [String]?
    let error: String?

    var issueCount: Int {
        summary?.totalIssues ?? issues?.count ?? 0
    }
}

nonisolated struct LibraryHealthResponse: Decodable, Sendable {
    let latest: LibraryHealthLog?
}
