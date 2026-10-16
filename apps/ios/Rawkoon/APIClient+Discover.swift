import Foundation
import RawkoonKit

// TMDB discovery, search, genres, providers, media detail, and the watchlist.

extension APIClient {
    func tmdbSearch(q: String, kind: String? = nil) async throws -> TmdbSearchResponse {
        try await get(
            "/api/medias/tmdb-search",
            query: ["q": q, "kind": kind, "language": Self.tmdbLanguage]
        )
    }

    /// Library titles and books matching `q`, for Find's first result group.
    func quickSearch(q: String, limit: Int = 6) async throws -> QuickSearchResponse {
        try await get("/api/search/quick", query: ["q": q, "limit": String(limit)])
    }

    func missingCollections() async throws -> MissingCollectionsResponse {
        try await get(Endpoints.missingCollections)
    }

    /// Discover deck (swipe)
    func discoverDeck(exclude: [Int], limit: Int = 20, language: String? = nil) async throws -> DiscoverDeckResponse {
        try await get(Endpoints.discoverDeck(exclude: exclude, limit: limit, language: language))
    }

    func dismissDiscover(tmdbId: Int, type: String) async throws {
        nonisolated struct Body: Encodable { let tmdbId: Int; let type: String }
        try await postExpectOK("/api/medias/discover/dismiss", body: Body(tmdbId: tmdbId, type: type))
    }

    /// Explore filter grid
    func discoverGrid(
        type: String,
        providerId: Int? = nil,
        genreId: Int? = nil,
        sortBy: String? = nil,
        page: Int = 1,
        language: String? = nil,
        originalLanguage: String? = nil
    ) async throws -> DiscoverMediasResponse {
        try await get(
            "/api/medias/discover",
            query: [
                "type": type,
                "provider_id": providerId.map(String.init),
                "genre_id": genreId.map(String.init),
                "sort_by": sortBy,
                "page": String(page),
                "language": language ?? Self.tmdbLanguage,
                "original_language": originalLanguage,
            ]
        )
    }

    func genres(type: String) async throws -> [Genre] {
        let response: GenresResponse = try await get("/api/medias/genres", query: ["type": type])
        return response.genres
    }

    func streamingProviders(type: String) async throws -> [StreamingProvider] {
        let response: StreamingProvidersResponse = try await get(
            "/api/medias/streaming-providers",
            query: ["type": type]
        )
        return response.providers
    }

    /// Detail
    func mediaModal(mediaType: String, tmdbId: Int) async throws -> MediaModalResponse {
        try await get(Endpoints.mediaModal(mediaType: mediaType, tmdbId: tmdbId))
    }

    func similar(tmdbId: Int, mediaType: String, language: String? = nil) async throws -> [TmdbSearchItem] {
        let response: SimilarResponse = try await get("/api/medias/similar/\(tmdbId)", query: [
            "type": mediaType == "tv" ? "tv" : "movie",
            "language": language ?? Self.tmdbLanguage,
        ])
        return response.items
    }

    func watchlist() async throws -> [WatchlistItem] {
        let response: WatchlistResponse = try await get("/api/medias/watchlist")
        return response.items
    }

    func addToWatchlist(
        tmdbId: Int,
        mediaType: String,
        title: String,
        posterURL: String?,
        overview: String?,
        releaseYear: Int?,
        voteAverage: Double?,
        releaseDate: String?
    ) async throws {
        try await postExpectOK("/api/medias/watchlist", body: WatchlistAddBody(
            tmdbId: tmdbId,
            mediaType: mediaType == "tv" ? "tv" : "movie",
            title: title,
            posterUrl: posterURL,
            overview: overview,
            releaseYear: releaseYear,
            voteAverage: voteAverage,
            releaseDate: releaseDate
        ))
    }

    func removeFromWatchlist(tmdbId: Int, mediaType: String) async throws {
        let request = try makeRequest(
            path: "/api/medias/watchlist/\(tmdbId)?type=\(mediaType == "tv" ? "tv" : "movie")",
            method: "DELETE",
            requiresAuth: true
        )
        let (data, response) = try await perform(request)
        try checkStatus(data, response)
    }
}

private nonisolated struct SimilarResponse: Decodable {
    let items: [TmdbSearchItem]
}

private nonisolated struct WatchlistAddBody: Encodable {
    let tmdbId: Int
    let mediaType: String
    let title: String
    let posterUrl: String?
    let overview: String?
    let releaseYear: Int?
    let voteAverage: Double?
    let releaseDate: String?
}
