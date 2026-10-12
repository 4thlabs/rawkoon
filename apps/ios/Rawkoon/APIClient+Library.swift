import Foundation
import RawkoonKit

// Library item CRUD, artwork, rescans, and download-history actions.

extension APIClient {
    /// Admin: add a movie/show to the library directly from TMDB.
    @discardableResult
    func addToLibrary(tmdbId: Int, type: String) async throws -> LibraryMedia {
        nonisolated struct Body: Encodable { let tmdbId: Int; let type: String }
        let response: LibraryItemResponse = try await post("/api/library", body: Body(tmdbId: tmdbId, type: type))
        return response.item
    }

    /// Library (movies / shows)
    func libraryList(
        type: String? = nil, status: String? = nil, q: String? = nil, page: Int? = nil, limit: Int? = nil,
        sortBy: String? = nil, sortDir: String? = nil
    ) async throws -> LibraryListResponse {
        try await get(Endpoints.libraryList(
            type: type, status: status, q: q, page: page, limit: limit, sortBy: sortBy, sortDir: sortDir
        ))
    }

    /// Random titles with something downloaded, avoiding `exclude` while enough others remain.
    func libraryRandom(limit: Int, exclude: [Int] = []) async throws -> [LibraryMedia] {
        try await get(Endpoints.libraryRandom(limit: limit, exclude: exclude)).items
    }

    func libraryItem(id: Int) async throws -> LibraryMedia {
        let response: LibraryItemResponse = try await get(
            "/api/library/item/\(id)",
            query: ["title_language": Self.titleLanguage]
        )
        return response.item
    }

    nonisolated func cachedLibraryItem(id: Int) -> Cached<LibraryMedia>? {
        guard let cached: Cached<LibraryItemResponse> = cached(
            "/api/library/item/\(id)",
            query: ["title_language": Self.titleLanguage]
        ) else { return nil }
        return Cached(value: cached.value.item, fetchedAt: cached.fetchedAt)
    }

    func updateLibraryMonitored(id: Int, monitored: Bool) async throws -> LibraryMedia {
        let response: LibraryItemResponse = try await patch(
            "/api/library/\(id)/monitored",
            body: UpdateLibraryMonitoredBody(monitored: monitored)
        )
        return response.item
    }

    func updateLibraryQualityProfile(id: Int, qualityProfileId: Int?) async throws -> LibraryMedia {
        let response: LibraryItemResponse = try await patch(
            "/api/library/\(id)/quality-profile",
            body: UpdateLibraryQualityProfileBody(qualityProfileId: qualityProfileId)
        )
        return response.item
    }

    /// Admin: set or clear per-media display overrides (title, sort title, year,
    /// overview, poster, backdrop). A `.clear` field removes the override; an
    /// omitted field is left untouched (mirrors the web overrides editor).
    func updateLibraryOverrides(id: Int, body: UpdateLibraryOverridesBody) async throws -> LibraryMedia {
        let response: LibraryItemResponse = try await patch(
            "/api/library/\(id)/overrides",
            body: body
        )
        return response.item
    }

    /// Poster or backdrop candidates (TMDB + fanart) for the artwork picker.
    func libraryArtworkCandidates(id: Int, kind: String) async throws -> [ArtworkCandidate] {
        let response: ArtworkCandidatesResponse = try await get(
            "/api/library/\(id)/images",
            query: ["kind": kind]
        )
        return response.candidates
    }

    func rescanLibraryItem(id: Int) async throws -> (
        rescanned: Int,
        skipped: Int,
        failed: Int,
        deleted: Int,
        imported: Int,
        requeued: Int
    ) {
        let response: RescanResponse = try await post("/api/library/\(id)/rescan", body: EmptyBody())
        return (
            rescanned: response.rescanned,
            skipped: response.skipped,
            failed: response.failed,
            deleted: response.deleted,
            imported: response.imported,
            requeued: response.requeued
        )
    }

    func removeFromLibrary(id: Int, deleteFiles: Bool) async throws {
        let query = deleteFiles ? "?delete_files=true" : ""
        let request = try makeRequest(
            path: "/api/library/\(id)\(query)",
            method: "DELETE",
            requiresAuth: true
        )
        let (data, response) = try await perform(request)
        try checkStatus(data, response)
    }

    func clearFailedDownloads(libraryId: Int) async throws -> Int {
        let request = try makeRequest(
            path: "/api/library/\(libraryId)/downloads/failed",
            method: "DELETE",
            requiresAuth: true
        )
        let (data, response) = try await perform(request)
        try checkStatus(data, response)
        let payload: DeleteCountResponse = try decodeJSON(data)
        return payload.deleted
    }

    func deleteDownloadEntry(libraryId: Int, downloadHistoryId: Int) async throws {
        let request = try makeRequest(
            path: "/api/library/\(libraryId)/downloads/\(downloadHistoryId)",
            method: "DELETE",
            requiresAuth: true
        )
        let (data, response) = try await perform(request)
        try checkStatus(data, response)
    }

    func downloadAction(
        libraryId: Int,
        downloadHistoryId: Int,
        action: String,
        deleteFiles: Bool = false
    ) async throws {
        let body: [String: Any] = [
            "action": action,
            "delete_files": deleteFiles,
        ]
        let (data, response) = try await postRaw("/api/library/\(libraryId)/downloads/\(downloadHistoryId)/action", body: body)
        try checkStatus(data, response)
    }
}

private nonisolated struct LibraryItemResponse: Decodable {
    let item: LibraryMedia
}

nonisolated struct UpdateLibraryMonitoredBody: Encodable {
    let monitored: Bool
}

private nonisolated struct UpdateLibraryQualityProfileBody: Encodable {
    let qualityProfileId: Int?
}

private nonisolated struct DeleteCountResponse: Decodable {
    let deleted: Int
}

private nonisolated struct RescanResponse: Decodable {
    let rescanned: Int
    let skipped: Int
    let failed: Int
    let deleted: Int
    let imported: Int
    let requeued: Int
}
