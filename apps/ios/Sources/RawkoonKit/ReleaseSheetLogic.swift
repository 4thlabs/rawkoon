import Foundation

/// A release as the best-match picker sees it; `ReleaseItem` conforms in the app target.
public protocol BestMatchCandidate: InteractiveSortable {
    var guidValue: String { get }
    var languageFallbackFlag: Bool { get }
}

/// Pure rules behind the release sheet: language tags, the other-versions group, the pinned best match.
/// Mirrors the web helpers `languageFallback.ts` and `bestMatch.ts`.
public enum ReleaseSheetLogic {
    public struct LanguageTag: Equatable, Sendable {
        public enum Kind: Equatable, Sendable {
            /// Audio in a language the profile wants.
            case audio
            /// Audio in the same language family, but not the preferred version.
            case fallback
            /// French subtitles over foreign audio: not a match for a French-audio profile.
            case subtitlesOnly
        }

        public let label: String
        public let kind: Kind
    }

    private static let subtitleFlags: Set<String> = ["vostfr", "vfstfr"]
    private static let frenchFlags: Set<String> = [
        "vff", "vfq", "vfi", "vf2", "truefrench", "vf", "french", "fr",
    ]

    /// The tag shown on a row, derived from the server's parsed language flags.
    public static func languageTag(
        languages: [String], isFallback: Bool, fallbackTag: String?
    ) -> LanguageTag? {
        if isFallback {
            return LanguageTag(label: fallbackTag ?? "?", kind: .fallback)
        }
        let flags = languages
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        let audio = flags.filter { !subtitleFlags.contains($0.lowercased()) }
        if audio.isEmpty {
            return flags.isEmpty ? nil : LanguageTag(label: "VOSTFR", kind: .subtitlesOnly)
        }
        return LanguageTag(label: audio[0].uppercased(), kind: .audio)
    }

    /// True for MULTi and every French variant tag.
    public static func isFrenchTag(_ tag: String) -> Bool {
        let lowered = tag.lowercased()
        return lowered == "multi" || frenchFlags.contains(lowered)
    }

    public struct FallbackSummary: Equatable, Sendable {
        public let total: Int
        public let isFrench: Bool
        /// "VFF (4), VFI (2)", most common first.
        public let breakdown: String
    }

    public static func fallbackSummary(counts: [String: Int]) -> FallbackSummary {
        let sorted = counts.sorted { $0.value != $1.value ? $0.value > $1.value : $0.key < $1.key }
        return FallbackSummary(
            total: sorted.reduce(0) { $0 + $1.value },
            isFrench: sorted.allSatisfy { isFrenchTag($0.key) },
            breakdown: sorted.map { "\($0.key) (\($0.value))" }.joined(separator: ", ")
        )
    }

    /// "VFQ", "VFQ or VF2", "VFQ, VF2 or VFI".
    public static func joinLanguages(_ languages: [String], or word: String) -> String {
        guard languages.count > 1 else { return languages.joined() }
        return languages.dropLast().joined(separator: ", ") + " \(word) " + (languages.last ?? "")
    }

    /// The release an automatic search would grab: the AI pick when set, else the top score
    /// among releases it may grab. Pass releases in server order; ties keep it.
    public static func pickBestMatch<T: BestMatchCandidate>(
        _ releases: [T], aiPickKey: String?, blockedGuids: Set<String>
    ) -> T? {
        let eligible = releases.filter {
            !$0.rejectedFlag && !$0.languageFallbackFlag && !blockedGuids.contains($0.guidValue)
        }
        if let aiPickKey, let picked = eligible.first(where: { $0.guidValue == aiPickKey }) {
            return picked
        }
        var best: T?
        for release in eligible {
            guard let score = release.qualityScoreValue else { continue }
            if best == nil || score > (best?.qualityScoreValue ?? 0) {
                best = release
            }
        }
        return best
    }
}
