import Foundation

extension AppModel {
    /// Paints the saved flag first so an offline launch hides Books too, then refreshes it from the server.
    func refreshBooksEnabled() async {
        guard let client = api() else { return }
        if let cached = client.cached(Endpoints.systemFeatures) {
            booksEnabled = cached.value.booksEnabled
        }
        if let features = try? await client.systemFeatures() {
            booksEnabled = features.booksEnabled
        }
    }
}
