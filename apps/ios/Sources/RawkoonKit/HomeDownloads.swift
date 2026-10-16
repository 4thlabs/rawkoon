import Foundation

/// The coarse phase of a queued download, derived from the download client's state string.
public enum DownloadPhase: String, CaseIterable, Sendable {
    case downloading, importing, seeding

    public static func classify(_ state: String) -> DownloadPhase {
        let lower = state.lowercased()
        if lower.contains("seed") || lower.contains("complete") {
            return .seeding
        }
        if lower.contains("import") || lower.contains("process") {
            return .importing
        }
        return .downloading
    }
}

/// One line on the Home Downloads card.
public struct HomeDownloadLine: Equatable, Sendable, Identifiable {
    public let id: String
    public let title: String
    public let progress: Double
    public let speed: Double
    public let etaSeconds: Int?
    public let state: String

    public init(id: String, title: String, progress: Double, speed: Double, etaSeconds: Int?, state: String) {
        self.id = id
        self.title = title
        self.progress = progress
        self.speed = speed
        self.etaSeconds = etaSeconds
        self.state = state
    }
}

/// The card's visible rows plus how many more the queue holds.
public struct HomeDownloadsSummary: Equatable, Sendable {
    public let shown: [HomeDownloadLine]
    public let hiddenCount: Int

    /// Only downloads still moving bytes or importing count; seeding rows stay in the queue screen.
    /// Fastest first, so a stalled row does not push the active ones out of view.
    public static func make(_ lines: [HomeDownloadLine], limit: Int) -> HomeDownloadsSummary {
        let active = lines.filter { DownloadPhase.classify($0.state) != .seeding }
        let ranked = active.enumerated().sorted { lhs, rhs in
            let (left, right) = (lhs.element, rhs.element)
            if left.speed != right.speed {
                return left.speed > right.speed
            }
            return lhs.offset < rhs.offset
        }.map(\.element)
        let shown = Array(ranked.prefix(max(0, limit)))
        return HomeDownloadsSummary(shown: shown, hiddenCount: ranked.count - shown.count)
    }

    public var isEmpty: Bool {
        shown.isEmpty
    }
}
