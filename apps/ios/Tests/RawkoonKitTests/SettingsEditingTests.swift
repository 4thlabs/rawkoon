@testable import RawkoonKit
import XCTest

final class SettingsEditingTests: XCTestCase {
    func testMovingSwapsNeighboursAndIgnoresTheEnds() {
        let items = ["a", "b", "c"]
        XCTAssertEqual(OrderedListEdit.moved(items, index: 1, by: -1), ["b", "a", "c"])
        XCTAssertEqual(OrderedListEdit.moved(items, index: 1, by: 1), ["a", "c", "b"])
        XCTAssertEqual(OrderedListEdit.moved(items, index: 0, by: -1), items)
        XCTAssertEqual(OrderedListEdit.moved(items, index: 2, by: 1), items)
        XCTAssertEqual(OrderedListEdit.moved(items, index: 9, by: -1), items)
    }

    func testAppendingTrimsAndSkipsDuplicates() {
        XCTAssertEqual(OrderedListEdit.appended(["a"], "  b "), ["a", "b"])
        XCTAssertEqual(OrderedListEdit.appended(["Alpha"], "alpha"), ["Alpha"])
        XCTAssertEqual(OrderedListEdit.appended(["a"], "   "), ["a"])
    }

    func testRemovingByIndex() {
        XCTAssertEqual(OrderedListEdit.removed(["a", "b", "c"], at: 1), ["a", "c"])
        XCTAssertEqual(OrderedListEdit.removed(["a"], at: 3), ["a"])
    }

    func testSeedDaysParseToMinutes() {
        XCTAssertEqual(SeedTimeDays.parse(""), .none)
        XCTAssertEqual(SeedTimeDays.parse("0"), .none)
        XCTAssertEqual(SeedTimeDays.parse("3"), .minutes(4320))
        XCTAssertEqual(SeedTimeDays.parse("1,5"), .minutes(2160))
        XCTAssertEqual(SeedTimeDays.parse("-1"), .invalid)
        XCTAssertEqual(SeedTimeDays.parse("soon"), .invalid)
    }

    func testSeedDaysPrefillText() {
        XCTAssertEqual(SeedTimeDays.text(forMinutes: nil), "")
        XCTAssertEqual(SeedTimeDays.text(forMinutes: 0), "")
        XCTAssertEqual(SeedTimeDays.text(forMinutes: 4320), "3")
        XCTAssertEqual(SeedTimeDays.text(forMinutes: 2160), "1.5")
        XCTAssertEqual(SeedTimeDays.text(forMinutes: 1440), "1")
        XCTAssertEqual(SeedTimeDays.text(forMinutes: 360), "0.25")
    }

    func testPrefillTextParsesBackToTheSameMinutes() {
        for minutes in [60, 90, 360, 1440, 2160, 4320, 10000, 1] {
            let text = SeedTimeDays.text(forMinutes: minutes)
            XCTAssertEqual(SeedTimeDays.parse(text), .minutes(minutes), "\(minutes) via \(text)")
        }
    }

    func testAnUntouchedFieldKeepsItsStoredMinutes() {
        for minutes in [360, 60, 1440, 2160] {
            let text = SeedTimeDays.text(forMinutes: minutes)
            XCTAssertEqual(
                SeedTimeDays.resolve(text: text, loadedText: text, loadedMinutes: minutes), .minutes(minutes)
            )
        }
        XCTAssertEqual(SeedTimeDays.resolve(text: "", loadedText: "", loadedMinutes: nil), .none)
    }

    func testAnEditedFieldIsParsedAnew() {
        let loaded = SeedTimeDays.text(forMinutes: 360)
        XCTAssertEqual(SeedTimeDays.resolve(text: "2", loadedText: loaded, loadedMinutes: 360), .minutes(2880))
        XCTAssertEqual(SeedTimeDays.resolve(text: "", loadedText: loaded, loadedMinutes: 360), .none)
        XCTAssertEqual(SeedTimeDays.resolve(text: "x", loadedText: loaded, loadedMinutes: 360), .invalid)
    }

    func testAppendingSeveralSplitsOnCommasAndNewlines() {
        XCTAssertEqual(OrderedListEdit.appendedAll(["a"], "b, c ,\nd"), ["a", "b", "c", "d"])
        XCTAssertEqual(OrderedListEdit.appendedAll(["a"], "A, a, , b,b"), ["a", "b"])
        XCTAssertEqual(OrderedListEdit.appendedAll([], "  "), [])
    }

    func testAFailedLibraryHealthRunCountsEvenWithoutIssues() {
        XCTAssertEqual(SystemHealth.libraryProblems(issueCount: 0, status: "failed"), 1)
        XCTAssertEqual(SystemHealth.libraryProblems(issueCount: 4, status: "failed"), 4)
        XCTAssertEqual(SystemHealth.libraryProblems(issueCount: 0, status: "success"), 0)
        XCTAssertEqual(SystemHealth.libraryProblems(issueCount: 2, status: nil), 2)
    }

    func testBlockedExtensionsNormalizeLikeTheServer() {
        XCTAssertEqual(BlockedExtensions.parse(".EXE, scr  bat"), ["exe", "scr", "bat"])
        XCTAssertEqual(BlockedExtensions.parse("exe,exe,.exe"), ["exe"])
        XCTAssertEqual(BlockedExtensions.parse("a-b, waytoolongextension, ok"), ["ok"])
        XCTAssertEqual(BlockedExtensions.parse(""), [])
        XCTAssertEqual(BlockedExtensions.text(["exe", "scr"]), "exe, scr")
    }

    func testHealthCountAddsEveryProblemSource() {
        XCTAssertEqual(SystemHealth.problemCount(readinessProblems: 1, attentionItems: 2, libraryIssues: 3, rssFailed: true), 7)
        XCTAssertEqual(SystemHealth.problemCount(readinessProblems: 0, attentionItems: 0, libraryIssues: 0, rssFailed: false), 0)
        XCTAssertEqual(SystemHealth.problemCount(readinessProblems: -2, attentionItems: 0, libraryIssues: 0, rssFailed: false), 0)
    }

    func testRssFailureStatuses() {
        XCTAssertTrue(SystemHealth.rssFailed(status: "failed"))
        XCTAssertTrue(SystemHealth.rssFailed(status: "Error"))
        XCTAssertFalse(SystemHealth.rssFailed(status: "success"))
        XCTAssertFalse(SystemHealth.rssFailed(status: nil))
    }
}
