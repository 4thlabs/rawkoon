import Foundation

/// What a wanted item's last search ended in, ready to show on its page, row and badge.
public struct LastSearchNote: Equatable, Sendable {
    public let outcome: LiveSearchOutcome
    public let at: Date?
    public let reason: String?

    /// Nil unless the item is still wanted and the server recorded an outcome this build knows.
    public init?(status: String, outcome: String?, at: String?, reason: String?) {
        guard status == "wanted", let outcome, let known = LiveSearchOutcome(rawValue: outcome) else { return nil }
        self.outcome = known
        self.at = at.flatMap(Self.parse)
        let trimmed = reason?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.reason = trimmed?.isEmpty == false ? trimmed : nil
    }

    /// A search that ended without a release, so a person has to step in.
    public var isMiss: Bool {
        outcome == .noMatch || outcome == .error
    }

    /// The age wording is dropped when the time is unknown, and for "not released" where it adds nothing.
    public var showsAge: Bool {
        at != nil && outcome != .notReleased
    }

    /// Misses newest first, capped; a miss without a time sorts last.
    public static func recentMisses<T>(_ items: [T], limit: Int, note: (T) -> LastSearchNote?) -> [T] {
        let misses = items.compactMap { item in note(item).map { (item, $0) } }.filter(\.1.isMiss)
        let sorted = misses.enumerated().sorted { lhs, rhs in
            let (l, r) = (lhs.element.1.at ?? .distantPast, rhs.element.1.at ?? .distantPast)
            return l == r ? lhs.offset < rhs.offset : l > r
        }
        return sorted.prefix(limit).map(\.element.0)
    }

    static func parse(_ iso: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return withFraction.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
    }
}
