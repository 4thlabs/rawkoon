import Foundation

/// How an admin's add should behave about the post-add search.
public enum AddMode: CaseIterable, Sendable, Hashable {
    /// Follows the server's auto-grab setting.
    case standard
    /// Adds without searching, then opens the release sheet.
    case chooseRelease
    /// Adds without searching and leaves it there.
    case withoutSearching

    /// The `search_on_add` value to send; nil defers to the server setting.
    public var searchOnAdd: Bool? {
        self == .standard ? nil : false
    }

    public var opensReleaseSheet: Bool {
        self == .chooseRelease
    }
}

/// What a movie or show search result offers in place of a bare poster.
public enum SearchResultAction: Equatable, Sendable {
    case add
    case request
    case inLibrary
    case requested
    case none

    /// `inLibrary` is the server's flag; `addedHere` / `requestedHere` cover this session before a refetch.
    public static func resolve(
        inLibrary: Bool, canAdd: Bool, isAdmin: Bool, addedHere: Bool, requestedHere: Bool
    ) -> SearchResultAction {
        if inLibrary || addedHere {
            return .inLibrary
        }
        if requestedHere {
            return .requested
        }
        guard canAdd else { return .none }
        return isAdmin ? .add : .request
    }

    /// The long-press menu only exists where there is a choice about searching.
    public var offersAddModes: Bool {
        self == .add
    }
}

/// Decides when the Home hero may rotate: never under a finger, and not for a while after one lifts.
public struct HeroInteractionGate: Equatable, Sendable {
    /// How long after the last touch the hero stays put.
    public static let resumeAfter: TimeInterval = 15

    /// A touch with no release for this long is treated as released: a cancelled gesture never reports its end.
    public static let touchTimeout: TimeInterval = 30

    public private(set) var touching = false
    public private(set) var lastTouch: Date?

    public init() {}

    public mutating func touchBegan(at now: Date) {
        touching = true
        lastTouch = now
    }

    public mutating func touchEnded(at now: Date) {
        touching = false
        lastTouch = now
    }

    /// True while a finger is down, unless the touch has gone stale.
    public func isTouching(at now: Date) -> Bool {
        guard touching, let lastTouch else { return false }
        return now.timeIntervalSince(lastTouch) < Self.touchTimeout
    }

    /// Seconds to wait before the next rotation, or nil while a finger is down.
    public func rotationDelay(at now: Date, interval: TimeInterval = HeroRotation.rotateSeconds) -> TimeInterval? {
        guard !isTouching(at: now) else { return nil }
        guard let lastTouch else { return interval }
        let quiet = max(0, Self.resumeAfter - now.timeIntervalSince(lastTouch))
        return max(interval, quiet)
    }
}
