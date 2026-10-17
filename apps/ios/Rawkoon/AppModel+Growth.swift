import Foundation

extension AppModel {
    private static let growthStaleAfter: TimeInterval = 300

    /// Shared by Home's card and the Library strip so each open doesn't refetch; `force` skips the freshness check.
    func refreshLibraryGrowth(force: Bool = false) async {
        guard let client = api() else {
            libraryGrowthFailed = libraryGrowth == nil
            return
        }
        if libraryGrowth == nil, let cached = client.cached(Endpoints.libraryGrowth),
           GrowthDates.isCurrentMonth(start: cached.value.growth.month.start, timezone: cached.value.growth.timezone)
        {
            libraryGrowth = cached.value.growth
        }
        if !force, libraryGrowth != nil, let at = libraryGrowthFetchedAt,
           Date().timeIntervalSince(at) < Self.growthStaleAfter
        {
            return
        }
        do {
            let fresh = try await client.libraryGrowth()
            withRawkoonMotion(RawkoonMotion.spring) { libraryGrowth = fresh }
            libraryGrowthFetchedAt = Date()
            libraryGrowthFailed = false
        } catch {
            Log.network.error("library growth fetch failed: \(String(describing: error), privacy: .public)")
            // A failed refresh must not leave last month's numbers up after the month rolls over.
            if let kept = libraryGrowth,
               !GrowthDates.isCurrentMonth(start: kept.month.start, timezone: kept.timezone)
            {
                withRawkoonMotion(RawkoonMotion.spring) { libraryGrowth = nil }
            }
            libraryGrowthFailed = libraryGrowth == nil
        }
    }
}
