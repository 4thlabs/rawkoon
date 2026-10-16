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

    private func tag(_ title: String, languages: [String] = []) -> L.LanguageTag? {
        L.languageTag(title: title, languages: languages, isFallback: false, fallbackTag: nil)
    }

    func testMultiWithAVariantNamesBoth() {
        XCTAssertEqual(tag("Film.2024.MULTi.VFQ.1080p.WEB"), .init(label: "MULTi VFQ", kind: .audio))
    }

    func testTrueFrenchReadsAsVff() {
        XCTAssertEqual(tag("Film.2024.TRUEFRENCH.1080p"), .init(label: "VFF", kind: .audio))
    }

    func testBareMulti() {
        XCTAssertEqual(tag("Film.2024.MULTi.1080p"), .init(label: "MULTi", kind: .audio))
    }

    func testSubtitleOnlyReleaseIsNotAnAudioMatch() {
        XCTAssertEqual(tag("Film.2024.VOSTFR.1080p.WEB"), .init(label: "VOSTFR", kind: .subtitlesOnly))
    }

    func testSubtitlesPlusAudioReadsAsAudio() {
        XCTAssertEqual(tag("Film.2024.VFF.VOSTFR.1080p")?.kind, .audio)
    }

    func testVf2StandsAlone() {
        XCTAssertEqual(tag("Film.2024.MULTi.VF2.1080p"), .init(label: "MULTi VF2", kind: .audio))
        XCTAssertEqual(tag("Film.2024.VF2.VFQ.1080p")?.label, "VF2")
    }

    func testEveryNamedVariantIsShown() {
        XCTAssertEqual(tag("Film.2024.VFQ.VFF.1080p")?.label, "VFF/VFQ")
    }

    func testFrenchOnlyCountsWithoutAnotherFlag() {
        XCTAssertEqual(tag("Film.2024.FRENCH.1080p")?.label, "FRENCH")
        XCTAssertEqual(tag("Film.2024.FRENCH.VFQ.1080p")?.label, "VFQ")
        XCTAssertEqual(tag("Film.2024.MULTi.FRENCH.1080p")?.label, "MULTi FRENCH")
    }

    func testBareVfNeedsNoSpecificVariant() {
        XCTAssertEqual(tag("Film.2024.VF.1080p")?.label, "VF")
        XCTAssertEqual(tag("Film.2024.VF.VFF.1080p")?.label, "VFF")
    }

    func testVqcReadsAsVfq() {
        XCTAssertEqual(tag("Film.2024.VQC.1080p")?.label, "VFQ")
    }

    func testPayloadLanguagesCountToo() {
        XCTAssertEqual(tag("Film.2024.1080p", languages: ["vfq"]), .init(label: "VFQ", kind: .audio))
    }

    func testFallbackUsesTheServerTagAndNoMarkersMeansNoTag() {
        XCTAssertEqual(
            L.languageTag(title: "x", languages: [], isFallback: true, fallbackTag: "VFF"),
            .init(label: "VFF", kind: .fallback)
        )
        XCTAssertNil(tag("Film.2024.1080p.WEB"))
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
