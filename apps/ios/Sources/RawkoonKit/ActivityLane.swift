import Foundation

/// The lanes of the Activity tab, in display order.
public enum ActivityLane: String, CaseIterable, Sendable {
    case inbox, queue, requests, calendar, history

    /// The queue shows downloads, which only admins can see.
    public static func visible(isAdmin: Bool) -> [ActivityLane] {
        allCases.filter { $0 != .queue || isAdmin }
    }

    /// A stale pick (a lane that is hidden for this user) falls back to the inbox.
    public static func validated(_ lane: ActivityLane, isAdmin: Bool) -> ActivityLane {
        visible(isAdmin: isAdmin).contains(lane) ? lane : .inbox
    }
}

/// An action an inbox row offers in place, on top of opening its destination.
public enum InboxAction: Equatable, Sendable {
    /// Run the search again for a title, a season or one episode that gave up.
    case searchAgain(libraryId: Int, season: Int?, episode: Int?)
    /// Open the Requests lane to decide a pending request.
    case reviewRequests

    public static func resolve(type: String, url: String?, isAdmin: Bool) -> InboxAction? {
        guard isAdmin else { return nil }
        switch type {
        case "request_pending":
            return .reviewRequests
        case "library_grab_skipped":
            guard case let .media(libraryId, season, episode, _)? = NotificationRoute.parse(url) else { return nil }
            return .searchAgain(libraryId: libraryId, season: season, episode: episode)
        default:
            return nil
        }
    }
}

/// The one plain status a Queue row shows.
public enum QueueStatus: String, CaseIterable, Sendable {
    case downloading, waiting, importing, stalled, failed
}

/// Why a row has its status, for the line under the title; the app words each case.
public enum QueueReason: Equatable, Sendable {
    case none, paused, queued, checking, fetchingMetadata, noPeers, importing, clientError
    /// The server's own failure text.
    case detail(String)
}

public struct QueueStatusLine: Equatable, Sendable {
    public let status: QueueStatus
    public let reason: QueueReason
}

public enum QueueClassifier {
    /// Maps a download's state and failure fields to one status and reason. Nil for a finished
    /// download that is only seeding, which is not in flight.
    public static func line(
        state: String, failed: Bool, failReason: String?, postProcessError: String?
    ) -> QueueStatusLine? {
        let lower = state.lowercased()
        if failed || lower.contains("error") || lower.contains("missing") {
            let detail = [postProcessError, failReason]
                .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
                .first { !$0.isEmpty }
            return QueueStatusLine(status: .failed, reason: detail.map(QueueReason.detail) ?? .clientError)
        }
        if lower.contains("import") || lower.contains("process") {
            return QueueStatusLine(status: .importing, reason: .importing)
        }
        if lower.contains("seed") || lower.contains("complete") {
            return nil
        }
        let waiting: [(String, QueueReason)] = [
            ("paused", .paused), ("stopped", .paused), ("queued", .queued),
            ("checking", .checking), ("meta", .fetchingMetadata),
        ]
        if lower.contains("stalled") {
            return QueueStatusLine(status: .stalled, reason: .noPeers)
        }
        if let match = waiting.first(where: { lower.contains($0.0) }) {
            return QueueStatusLine(status: .waiting, reason: match.1)
        }
        return QueueStatusLine(status: .downloading, reason: .none)
    }
}
