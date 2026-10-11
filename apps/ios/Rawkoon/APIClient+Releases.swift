import Foundation
import RawkoonKit

// Requests, interactive release search, grabs, AI picks, and the blocklist.

extension APIClient {
    /// Requests
    func requestsList() async throws -> RequestsResponse {
        try await get("/api/requests")
    }

    func createRequest(_ body: CreateRequestBody) async throws -> [String: Int] {
        try await post("/api/requests", body: body)
    }

    /// Interactive release search + grab
    func interactiveSearch(
        q: String,
        libraryMediaId: Int? = nil,
        season: Int? = nil,
        complete: Bool = false,
        tmdbId: Int? = nil,
        mediaType: String? = nil
    ) async throws -> InteractiveSearchResponse {
        try await get("/api/medias/interactive-search", query: [
            "q": q,
            "library_media_id": libraryMediaId.map(String.init),
            "season": season.map(String.init),
            "complete": complete ? "true" : nil,
            "tmdb_id": tmdbId.map(String.init),
            "media_type": mediaType,
        ], longWait: true)
    }

    /// Returns the grab result: the route replies 200 with `{grabbed:false, reason}`
    /// on a post-validation failure, so the caller must check `grabbed`, not status.
    func grabByToken(_ token: String) async throws -> LibrarySearchResponse {
        try await post("/api/medias/interactive-search/download", body: GrabTokenBody(token: token))
    }

    func grabByUrl(libraryId: Int, body: GrabUrlBody) async throws -> LibrarySearchResponse {
        try await post("/api/library/\(libraryId)/grab", body: body)
    }

    /// Whether the interactive AI pick should run: the integration is on and its
    /// interactive feature has not been switched off (a missing key means on).
    func aiInteractivePickEnabled() async -> Bool {
        do {
            let response: AiProviderIntegrationResponse = try await get("/api/integrations/ai-provider")
            let integration = response.integration
            return integration.enabled && (integration.features?.isOn(.releasePickInteractive) ?? true)
        } catch {
            return false
        }
    }

    /// Fire-and-forget: loads the model into VRAM so the first real pick is fast.
    func aiWarm() async {
        guard let request = try? makeRequest(path: "/api/medias/search/ai-warm", method: "GET", requiresAuth: true) else { return }
        _ = try? await perform(request)
    }

    func aiPick(_ body: AiPickRequest) async throws -> AiPick {
        try await post("/api/medias/search/ai-pick", body: body, longWait: true)
    }

    func blockRelease(_ body: BlocklistBody) async throws {
        try await postExpectOK("/api/medias/blocklist", body: body)
    }
}
