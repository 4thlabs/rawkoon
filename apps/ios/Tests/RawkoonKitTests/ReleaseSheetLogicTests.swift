@testable import RawkoonKit
import XCTest

private struct Candidate: BestMatchCandidate {
    var guidValue: String
    var qualityScoreValue: Double?
    var languageFallbackFlag = false
    var rejectedFlag = false
    var seedersValue: Int?
    var ageValue: Int?
    var sizeBytesValue: Int?
    var titleValue: String {
        guidValue
    }
}

final class ReleaseSheetLogicTests: XCTestCase {
    typealias L = ReleaseSheetLogic

    func testAudioTagUsesTheFirstAudioFlag() {
        let tag = L.languageTag(languages: ["VFQ", "MULTi"], isFallback: false, fallbackTag: nil)
        XCTAssertEqual(tag, .init(label: "VFQ", kind: .audio))
    }

    func testSubtitleOnlyReleaseIsNotAnAudioMatch() {
        let tag = L.languageTag(languages: ["VOSTFR"], isFallback: false, fallbackTag: nil)
        XCTAssertEqual(tag, .init(label: "VOSTFR", kind: .subtitlesOnly))
    }

    func testSubtitlesPlusAudioReadsAsAudio() {
        let tag = L.languageTag(languages: ["VOSTFR", "VFF"], isFallback: false, fallbackTag: nil)
        XCTAssertEqual(tag?.kind, .audio)
    }

    func testFallbackUsesTheServerTagAndNoFlagsMeansNoTag() {
        XCTAssertEqual(
            L.languageTag(languages: [], isFallback: true, fallbackTag: "VFF"),
            .init(label: "VFF", kind: .fallback)
        )
        XCTAssertNil(L.languageTag(languages: [], isFallback: false, fallbackTag: nil))
    }

    func testFallbackSummaryOrdersByCountAndDetectsFrench() {
        let summary = L.fallbackSummary(counts: ["VFI": 2, "VFF": 4, "MULTi": 1])
        XCTAssertEqual(summary.total, 7)
        XCTAssertTrue(summary.isFrench)
        XCTAssertEqual(summary.breakdown, "VFF (4), VFI (2), MULTi (1)")
        XCTAssertFalse(L.fallbackSummary(counts: ["EN": 1]).isFrench)
    }

    func testJoinLanguages() {
        XCTAssertEqual(L.joinLanguages(["VFQ"], or: "or"), "VFQ")
        XCTAssertEqual(L.joinLanguages(["VFQ", "VF2"], or: "or"), "VFQ or VF2")
        XCTAssertEqual(L.joinLanguages(["VFQ", "VF2", "VFI"], or: "or"), "VFQ, VF2 or VFI")
    }

    func testBestMatchSkipsRejectedFallbackAndBlocked() {
        let releases = [
            Candidate(guidValue: "rejected", qualityScoreValue: 900, rejectedFlag: true),
            Candidate(guidValue: "fallback", qualityScoreValue: 800, languageFallbackFlag: true),
            Candidate(guidValue: "blocked", qualityScoreValue: 700),
            Candidate(guidValue: "first", qualityScoreValue: 500),
            Candidate(guidValue: "tie", qualityScoreValue: 500),
        ]
        let best = L.pickBestMatch(releases, aiPickKey: nil, blockedGuids: ["blocked"])
        XCTAssertEqual(best?.guidValue, "first")
    }

    func testAiPickWinsOverScore() {
        let releases = [
            Candidate(guidValue: "top", qualityScoreValue: 900),
            Candidate(guidValue: "ai", qualityScoreValue: 10),
        ]
        XCTAssertEqual(L.pickBestMatch(releases, aiPickKey: "ai", blockedGuids: [])?.guidValue, "ai")
    }

    func testNoScoredReleaseMeansNoBestMatch() {
        XCTAssertNil(L.pickBestMatch([Candidate(guidValue: "a")], aiPickKey: nil, blockedGuids: []))
    }
}
