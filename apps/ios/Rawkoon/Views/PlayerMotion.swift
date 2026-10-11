import SwiftUI

/// The player's motion rules, pure so they can be tested.
nonisolated enum PlayerMotion {
    /// Far enough to read as "resting", near enough that the cover never looks like it is closing.
    static let pausedArtworkScale: CGFloat = 0.9

    static func artworkScale(isPlaying: Bool, reduceMotion: Bool) -> CGFloat {
        isPlaying || reduceMotion ? 1 : pausedArtworkScale
    }

    /// What the sleep chip rolls on: a mode change, then each displayed second of the countdown.
    static func sleepRollValue(isOff: Bool, remaining: Double?) -> Double {
        if isOff {
            return 0
        }
        guard let remaining, remaining.isFinite else { return -1 }
        return max(1, remaining.rounded())
    }
}
