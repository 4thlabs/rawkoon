import Foundation

/// How a finished search ended; mirrors the server's `SearchOutcome`.
public enum LiveSearchOutcome: String, Equatable, Sendable {
    case grabbed
    case delayed
    case noMatch = "no_match"
    case notReleased = "not_released"
    case error

    /// Higher wins when a show's seasons report one after another.
    public var rank: Int {
        switch self {
        case .grabbed: 4
        case .delayed: 3
        case .noMatch: 2
        case .notReleased: 1
        case .error: 0
        }
    }
}

/// A finished search, as pushed on the library stream or returned by a search call.
public struct LiveSearchResult: Equatable, Sendable {
    public let mediaId: Int
    public let season: Int?
    public let outcome: LiveSearchOutcome
    public let releaseTitle: String?
    public let resolution: Int?
    public let source: String?
    public let sizeBytes: Int64?
    /// ISO time a held grab is released, or the digital release for `notReleased`.
    public let delayUntil: String?
    public let targetKeys: [String]
    public let reason: String?

    public init(
        mediaId: Int, season: Int? = nil, outcome: LiveSearchOutcome, releaseTitle: String? = nil,
        resolution: Int? = nil, source: String? = nil, sizeBytes: Int64? = nil, delayUntil: String? = nil,
        targetKeys: [String] = [], reason: String? = nil
    ) {
        self.mediaId = mediaId
        self.season = season
        self.outcome = outcome
        self.releaseTitle = releaseTitle
        self.resolution = resolution
        self.source = source
        self.sizeBytes = sizeBytes
        self.delayUntil = delayUntil
        self.targetKeys = targetKeys
        self.reason = reason
    }
}

/// Why an add did not search; mirrors the server's `SearchSkippedReason`.
public enum LiveSearchSkip: Equatable, Sendable {
    case settingOff
    case overrideOff
    case notMonitored
    /// `ymd` is the digital release day when known.
    case notReleased(ymd: String?)
}

/// What the one toast for an item says right now. The app maps each case to localized text.
public enum LiveSearchPhase: Equatable, Sendable {
    case searching
    case stillSearching
    /// `release` is already shortened; `quality` is e.g. "1080p WEB-DL 4.2 GB".
    case grabbed(release: String?, quality: String?)
    /// `minutes` until the held grab starts by itself, when known.
    case held(minutes: Int?, targetKeys: [String])
    case noMatch
    case notReleased(ymd: String?)
    case skipped(LiveSearchSkip)
    /// A plain confirmation for an add that had nothing to search.
    case added
    case grabNowMiss
    /// Some held releases were grabbed and the rest could not be.
    case grabNowPartial
    case failed(reason: String?)

    public enum Action: Equatable, Sendable {
        case none
        case chooseRelease
        case grabNow(targetKeys: [String])
        case searchNow
    }

    public var action: Action {
        switch self {
        case .noMatch, .grabNowMiss: .chooseRelease
        case let .held(_, keys): keys.isEmpty ? .none : .grabNow(targetKeys: keys)
        case let .skipped(skip):
            switch skip {
            case .settingOff, .overrideOff: .searchNow
            case .notMonitored, .notReleased: .none
            }
        default: .none
        }
    }

    /// Seconds the toast stays up; nil means until something replaces it.
    public var lifetime: TimeInterval? {
        switch self {
        case .searching: nil
        case .stillSearching: 6
        case .grabbed: 5
        case .added: 3
        case .failed: 5
        case .notReleased: 6
        case .grabNowPartial: 6
        case .noMatch, .grabNowMiss, .held, .skipped: action == .none ? 6 : 10
        }
    }
}

/// One toast update: which item, its display title, and the phase to show.
public struct LiveSearchUpdate: Equatable, Sendable {
    public let mediaId: Int
    public let title: String
    public let phase: LiveSearchPhase
}

/// A "grabbed" notification, reduced to what decides whether a live toast already said it.
public struct GrabNotice: Equatable, Sendable {
    public let mediaId: Int
    public let season: Int?
    public let episode: Int?
    public let body: String

    public init(mediaId: Int, season: Int?, episode: Int?, body: String) {
        self.mediaId = mediaId
        self.season = season
        self.episode = episode
        self.body = body
    }
}

/// Follows one live toast per item from "Searching…" to its outcome, and says when
/// a separate "grabbed" notification popup would only repeat it.
/// Pure value logic, with time passed in, so it is tested without a UI.
public struct LiveSearchTracker: Equatable, Sendable {
    /// A search that has not answered by now keeps going; the grab lands as a notification.
    public static let stillSearchingAfter: TimeInterval = 120
    /// A grab notification can trail the result a little; keep hiding its popup.
    static let grace: TimeInterval = 20
    /// A result can beat the add response that starts tracking; hold it this long.
    static let earlyResultWindow: TimeInterval = 15
    /// How much of a release title a notification body must contain to count as the same grab.
    static let releaseMatchLength = 12

    struct GrabbedRelease: Equatable, Sendable {
        var season: Int?
        var title: String?
    }

    struct Entry: Equatable, Sendable {
        var title: String
        var isShow: Bool
        var startedAt: Date
        var settledRank: Int?
        var settledAt: Date?
        var grabs: [GrabbedRelease] = []
    }

    struct EarlyResult: Equatable, Sendable {
        var result: LiveSearchResult
        var receivedAt: Date
    }

    private(set) var entries: [Int: Entry] = [:]
    private(set) var early: [Int: [EarlyResult]] = [:]

    public init() {}

    /// Starts (or restarts) tracking an item whose search is running. A result that already
    /// arrived for it is shown instead of "Searching…".
    @discardableResult
    public mutating func start(mediaId: Int, title: String, isShow: Bool, now: Date) -> LiveSearchUpdate {
        entries[mediaId] = Entry(title: title, isShow: isShow, startedAt: now)
        return replayEarly(mediaId: mediaId, now: now)
            ?? LiveSearchUpdate(mediaId: mediaId, title: title, phase: .searching)
    }

    /// Starts a fresh search for an item already tracked, keeping its title.
    public mutating func restart(mediaId: Int, now: Date) -> LiveSearchUpdate? {
        guard let entry = entries[mediaId] else { return nil }
        return start(mediaId: mediaId, title: entry.title, isShow: entry.isShow, now: now)
    }

    public func isShow(_ mediaId: Int) -> Bool {
        entries[mediaId]?.isShow ?? false
    }

    /// Tracks an item without a "Searching…" toast, so only its outcome is shown.
    @discardableResult
    public mutating func watch(mediaId: Int, title: String, isShow: Bool, now: Date) -> LiveSearchUpdate? {
        entries[mediaId] = Entry(title: title, isShow: isShow, startedAt: now)
        return replayEarly(mediaId: mediaId, now: now)
    }

    public func isTracking(_ mediaId: Int) -> Bool {
        entries[mediaId] != nil
    }

    /// Feeds a finished search in. Nil for an item not tracked yet (the result is held briefly
    /// for when it is), or a result no better than what is shown.
    public mutating func apply(_ result: LiveSearchResult, now: Date) -> LiveSearchUpdate? {
        guard var entry = entries[result.mediaId] else {
            early[result.mediaId, default: []].append(EarlyResult(result: result, receivedAt: now))
            dropStaleEarly(now: now)
            return nil
        }
        if result.outcome == .grabbed {
            entry.grabs.append(GrabbedRelease(season: result.season, title: result.releaseTitle))
            entry.settledAt = now
        }
        let rank = result.outcome.rank
        if let settled = entry.settledRank, rank <= settled {
            entries[result.mediaId] = entry
            return nil
        }
        entry.settledRank = rank
        entry.settledAt = now
        entries[result.mediaId] = entry
        return LiveSearchUpdate(
            mediaId: result.mediaId, title: entry.title, phase: Self.phase(for: result, now: now)
        )
    }

    /// Settles an item on a phase that did not come from a search result (a skipped add, "Grab now" answer).
    public mutating func settle(mediaId: Int, phase: LiveSearchPhase, now: Date) -> LiveSearchUpdate? {
        guard var entry = entries[mediaId] else { return nil }
        entry.settledRank = LiveSearchOutcome.delayed.rank
        entry.settledAt = now
        entries[mediaId] = entry
        return LiveSearchUpdate(mediaId: mediaId, title: entry.title, phase: phase)
    }

    /// The "still searching" nudge, only while no outcome has arrived.
    public mutating func giveUpWaiting(mediaId: Int, now: Date) -> LiveSearchUpdate? {
        guard var entry = entries[mediaId], entry.settledRank == nil else { return nil }
        entry.settledRank = -1
        entry.settledAt = now
        entries[mediaId] = entry
        return LiveSearchUpdate(mediaId: mediaId, title: entry.title, phase: .stillSearching)
    }

    /// True while the item's toast is still searching, or briefly after it reported this very grab,
    /// so the notification popup would only repeat it. Other grabs of the item still show.
    public func suppressesGrabNotice(_ notice: GrabNotice, now: Date) -> Bool {
        guard let entry = entries[notice.mediaId] else { return false }
        guard let settledAt = entry.settledAt else {
            return now.timeIntervalSince(entry.startedAt) < Self.stillSearchingAfter
        }
        guard now.timeIntervalSince(settledAt) < Self.grace, notice.episode == nil else { return false }
        return entry.grabs.contains { grab in
            guard grab.season == notice.season else { return false }
            guard let title = grab.title else { return true }
            return notice.body.contains(String(title.prefix(Self.releaseMatchLength)))
        }
    }

    /// Drops entries that can no longer suppress anything.
    public mutating func prune(now: Date) {
        entries = entries.filter { _, entry in
            if let settledAt = entry.settledAt {
                return now.timeIntervalSince(settledAt) < Self.grace
            }
            return now.timeIntervalSince(entry.startedAt) < Self.stillSearchingAfter
        }
        dropStaleEarly(now: now)
    }

    private mutating func dropStaleEarly(now: Date) {
        early = early.compactMapValues { list in
            let fresh = list.filter { now.timeIntervalSince($0.receivedAt) < Self.earlyResultWindow }
            return fresh.isEmpty ? nil : fresh
        }
    }

    private mutating func replayEarly(mediaId: Int, now: Date) -> LiveSearchUpdate? {
        dropStaleEarly(now: now)
        guard let held = early.removeValue(forKey: mediaId) else { return nil }
        var last: LiveSearchUpdate?
        for item in held {
            last = apply(item.result, now: now) ?? last
        }
        return last
    }

    // MARK: Presentation

    static func phase(for result: LiveSearchResult, now: Date) -> LiveSearchPhase {
        switch result.outcome {
        case .grabbed:
            guard let title = result.releaseTitle else { return .grabbed(release: nil, quality: nil) }
            return .grabbed(release: shortReleaseTitle(title), quality: qualityLine(result))
        case .delayed:
            return .held(minutes: minutesUntil(result.delayUntil, now: now), targetKeys: result.targetKeys)
        case .noMatch:
            return .noMatch
        case .notReleased:
            return .notReleased(ymd: result.delayUntil.map { String($0.prefix(10)) })
        case .error:
            return .failed(reason: result.reason)
        }
    }

    static func minutesUntil(_ iso: String?, now: Date) -> Int? {
        guard let iso, let date = parseISO(iso) else { return nil }
        return max(1, Int((date.timeIntervalSince(now) / 60).rounded(.up)))
    }

    private static func parseISO(_ iso: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: iso) {
            return date
        }
        return ISO8601DateFormatter().date(from: iso)
    }

    private static let qualityToken = try? NSRegularExpression(
        pattern: #"\b(2160p|1080[pi]|720p|576p|480p|4K|UHD|WEB[-.]?DL|WEB[-.]?Rip|WEB|BluRay|BDRip|BDRemux|REMUX|HDTV|HDRip|DVDRip|MULTI|TRUEFRENCH|FRENCH|VFF|VFQ|VFI)\b"#,
        options: [.caseInsensitive]
    )

    /// "Some.Movie.2024.1080p.WEB-DL-GRP" becomes "Some Movie 2024".
    public static func shortReleaseTitle(_ title: String, max: Int = 44) -> String {
        var head = title
        let range = NSRange(title.startIndex..., in: title)
        if let match = qualityToken?.firstMatch(in: title, range: range), let cut = Range(match.range, in: title) {
            head = String(title[..<cut.lowerBound])
        }
        let spaced = head.replacingOccurrences(of: "[._]+", with: " ", options: .regularExpression)
        let trimmed = spaced.replacingOccurrences(of: "[\\s-]+$", with: "", options: .regularExpression)
            .trimmingCharacters(in: .whitespaces)
        let text = trimmed.isEmpty ? title : trimmed
        guard text.count > max else { return text }
        return String(text.prefix(max - 1)).trimmingCharacters(in: .whitespaces) + "…"
    }

    static func qualityLine(_ result: LiveSearchResult) -> String? {
        var parts: [String] = []
        if let resolution = result.resolution {
            parts.append("\(resolution)p")
        }
        if let source = result.source, !source.isEmpty {
            parts.append(source)
        }
        if let size = result.sizeBytes, size > 0 {
            parts.append(ByteCountFormatter.string(fromByteCount: size, countStyle: .file))
        }
        return parts.isEmpty ? nil : parts.joined(separator: " ")
    }

    /// The phase for an add response that did not queue a search.
    public static func phase(skipped reason: String?, digitalReleaseDate: String?) -> LiveSearchPhase {
        switch reason {
        case "setting_off": .skipped(.settingOff)
        case "override_off": .skipped(.overrideOff)
        case "not_monitored": .skipped(.notMonitored)
        case "not_released": .skipped(.notReleased(ymd: digitalReleaseDate.map { String($0.prefix(10)) }))
        default: .added
        }
    }
}
