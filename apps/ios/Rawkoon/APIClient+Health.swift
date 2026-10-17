import Foundation

extension APIClient {
    func libraryHealth() async throws -> LibraryHealthResponse {
        try await get("/api/admin/library-health", query: ["limit": "1"])
    }
}
