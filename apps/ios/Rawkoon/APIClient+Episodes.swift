import Foundation
import RawkoonKit

// Episodes, files, remux, per-title search, and monitoring toggles.

extension APIClient {
    func libraryEpisodes(id: Int) async throws -> EpisodesResponse {
        try await get("/api/library/\(id)/episodes")
    }

    func libraryFiles(id: Int) async throws -> LibraryFilesResponse {
        try await get("/api/library/\(id)/files")
    }

    func remuxFile(
        fileId: Int,
        keepAudioTrackIndices: [Int],
        keepSubtitleTrackIndices: [Int]
    ) async throws -> RemuxStartResponse {
        try await post(
            "/api/library/files/\(fileId)/remux",
            body: RemuxRequest(
                keepAudioTrackIndices: keepAudioTrackIndices,
                keepSubtitleTrackIndices: keepSubtitleTrackIndices
            )
        )
    }

    func remuxFileStatus(fileId: Int) async throws -> RemuxFileStatus {
        try await get("/api/library/files/\(fileId)/remux/status")
    }

    /// Movie auto search: the server picks and grabs the best release (AI judge
    /// included). Long lane, like every search that waits on the indexers.
    func searchMovie(id: Int) async throws -> LibrarySearchResponse {
        try await post(
            "/api/library/\(id)/search",
            body: LibrarySearchBody(searchQuery: nil),
            longWait: true
        )
    }

    /// Queues an automatic upgrade search for the item (or its failing episodes).
    func startUpgradeSearch(id: Int) async throws -> LibraryUpgradeResponse {
        try await post("/api/library/\(id)/upgrade", body: LibraryUpgradeBody(mode: "auto"))
    }

    /// Manual release search + grab for a whole season (best season pack).
    func searchSeason(id: Int, season: Int, searchQuery: String? = nil) async throws -> LibrarySearchResponse {
        try await post(
            "/api/library/\(id)/seasons/\(season)/search",
            body: LibrarySearchBody(searchQuery: searchQuery),
            longWait: true
        )
    }

    /// Manual release search + grab for a single episode.
    func searchEpisode(id: Int, episodeId: Int, searchQuery: String? = nil) async throws -> LibrarySearchResponse {
        try await post(
            "/api/library/\(id)/episodes/\(episodeId)/search",
            body: LibrarySearchBody(searchQuery: searchQuery),
            longWait: true
        )
    }

    /// Resets every "skipped" episode in a season back to "wanted" so it's picked up again.
    func retrySkippedSeason(id: Int, season: Int) async throws -> Int {
        let response: RetriedResponse = try await post(
            "/api/library/\(id)/seasons/\(season)/retry-skipped",
            body: EmptyBody()
        )
        return response.retried
    }

    func setEpisodeMonitored(id: Int, episodeId: Int, monitored: Bool) async throws -> Bool {
        let response: EpisodeMonitoredResponse = try await patch(
            "/api/library/\(id)/episodes/\(episodeId)/monitored",
            body: UpdateLibraryMonitoredBody(monitored: monitored)
        )
        return response.episode.monitored
    }

    /// Bulk toggle monitoring for every episode in a season. Returns the number of episodes updated.
    func setSeasonMonitored(id: Int, season: Int, monitored: Bool) async throws -> Int {
        let response: SeasonMonitoredResponse = try await patch(
            "/api/library/\(id)/seasons/\(season)/monitored",
            body: UpdateLibraryMonitoredBody(monitored: monitored)
        )
        return response.updated
    }

    /// Resets an episode's status (e.g. "wanted" to retry a skipped episode).
    func setEpisodeStatus(id: Int, episodeId: Int, status: String) async throws -> String {
        let response: EpisodeStatusResponse = try await patch(
            "/api/library/\(id)/episodes/\(episodeId)/status",
            body: UpdateLibraryStatusBody(status: status)
        )
        return response.episode.status
    }

    /// Removes an episode's files (row + disk) and resets it to "wanted".
    func deleteEpisodeFile(id: Int, episodeId: Int) async throws {
        try await deleteExpectOK("/api/library/\(id)/episodes/\(episodeId)", query: ["delete_file": "true"])
    }

    /// Removes a single `MediaFile` row (movies) and its file on disk.
    func deleteMovieFile(fileId: Int) async throws {
        try await deleteExpectOK("/api/library/files/\(fileId)", query: ["delete_file": "true"])
    }
}

private nonisolated struct UpdateLibraryStatusBody: Encodable {
    let status: String
}

private nonisolated struct LibrarySearchBody: Encodable {
    let searchQuery: String?
}

private nonisolated struct RetriedResponse: Decodable {
    let retried: Int
}

private nonisolated struct EpisodeMonitoredPayload: Decodable {
    let id: Int
    let monitored: Bool
}

private nonisolated struct EpisodeMonitoredResponse: Decodable {
    let episode: EpisodeMonitoredPayload
}

private nonisolated struct SeasonMonitoredResponse: Decodable {
    let updated: Int
}

private nonisolated struct EpisodeStatusPayload: Decodable {
    let id: Int
    let status: String
    let searchAttempts: Int
}

private nonisolated struct EpisodeStatusResponse: Decodable {
    let episode: EpisodeStatusPayload
}
