import RawkoonKit
import SwiftUI

extension ExploreView {
    private func fetchPage(client: APIClient, page: Int) async throws -> DiscoverMediasResponse {
        try await client.discoverGrid(
            type: filters.kind.apiValue,
            providerId: filters.provider?.id,
            genreId: filters.genre?.id,
            sortBy: filters.sort.rawValue,
            page: page,
            originalLanguage: originalLanguageFilter
        )
    }

    /// The saved copy of the page `fetchPage` would request with the same filters.
    private func cachedPage(client: APIClient, page: Int) -> DiscoverMediasResponse? {
        client.cached(Endpoints.discoverGrid(
            type: filters.kind.apiValue,
            providerId: filters.provider?.id,
            genreId: filters.genre?.id,
            sortBy: filters.sort.rawValue,
            page: page,
            originalLanguage: originalLanguageFilter
        ))?.value
    }

    private var originalLanguageFilter: String? {
        filters.originalLanguageOnly ? Locale.current.language.languageCode?.identifier : nil
    }

    func loadFirstPage() async {
        guard let client = model.api() else {
            error = String(localized: "Not signed in.")
            loading = false
            return
        }
        let generation = loadGeneration
        if items.isEmpty, let cached = cachedPage(client: client, page: 1) {
            items = cached.items
            page = cached.page
            totalPages = cached.totalPages
            totalResults = cached.totalResults
        }
        loading = true
        error = nil
        defer {
            if generation == loadGeneration {
                loading = false
            }
        }
        do {
            let response = try await fetchPage(client: client, page: 1)
            guard generation == loadGeneration else { return }
            items = response.items
            page = response.page
            totalPages = response.totalPages
            totalResults = response.totalResults
        } catch let apiError as APIError {
            guard generation == loadGeneration else { return }
            error = message(for: apiError)
        } catch {
            guard generation == loadGeneration else { return }
            self.error = String(localized: "Can't reach the server. Try again in a moment.")
        }
    }

    /// `force` lets the "Tap to retry" button bypass the `loadMoreError`
    /// guard that otherwise stops the automatic `onAppear` trigger from
    /// hot-looping after a failed page fetch.
    func loadMore(force: Bool = false) async {
        guard !loadingMore, !loading, page < totalPages, force || loadMoreError == nil else { return }
        guard let client = model.api() else { return }
        let generation = loadGeneration
        loadingMore = true
        loadMoreError = nil
        defer {
            if generation == loadGeneration {
                loadingMore = false
            }
        }
        do {
            let response = try await fetchPage(client: client, page: page + 1)
            guard generation == loadGeneration else { return }
            items.append(contentsOf: response.items)
            page = response.page
            totalPages = response.totalPages
            totalResults = response.totalResults
        } catch let apiError as APIError {
            guard generation == loadGeneration else { return }
            // Offline, the next page may still be saved from an earlier scroll.
            if apiError.isNetworkFailure, let cached = cachedPage(client: client, page: page + 1) {
                items.append(contentsOf: cached.items)
                page = cached.page
                totalPages = cached.totalPages
                totalResults = cached.totalResults
            } else {
                loadMoreError = message(for: apiError)
            }
        } catch {
            guard generation == loadGeneration else { return }
            loadMoreError = String(localized: "Can't reach the server.")
        }
    }

    private func message(for error: APIError) -> String {
        error.userMessage(unauthorized: String(localized: "Sign in required."))
    }
}
