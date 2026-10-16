@testable import RawkoonKit
import XCTest

final class LastSearchNoteTests: XCTestCase {
    private func note(
        status: String = "wanted", outcome: String? = "no_match", time: String? = "2026-10-16T17:38:10.872Z",
        reason: String? = "No matching releases found"
    ) -> LastSearchNote? {
        LastSearchNote(status: status, outcome: outcome, at: time, reason: reason)
    }

    func testNoMatchOnWantedItem() throws {
        let note = try XCTUnwrap(note())
        XCTAssertEqual(note.outcome, .noMatch)
        XCTAssertTrue(note.isMiss)
        XCTAssertTrue(note.showsAge)
        XCTAssertEqual(note.reason, "No matching releases found")
    }

    func testOnlyWantedItemsCarryANote() {
        XCTAssertNil(note(status: "downloaded"))
        XCTAssertNil(note(status: "downloading"))
    }

    func testMissingOrUnknownOutcomeIsNil() {
        XCTAssertNil(note(outcome: nil))
        XCTAssertNil(note(outcome: "something_new"))
    }

    func testBlankReasonIsDropped() throws {
        XCTAssertNil(try XCTUnwrap(note(reason: "  \n")).reason)
    }

    func testTimeParsesWithAndWithoutFraction() throws {
        XCTAssertNotNil(try XCTUnwrap(note(time: "2026-10-16T17:38:10Z")).searchedAt)
        XCTAssertNotNil(try XCTUnwrap(note(time: "2026-10-16T17:38:10.872Z")).searchedAt)
        XCTAssertNil(try XCTUnwrap(note(time: "garbage")).searchedAt)
        XCTAssertFalse(try XCTUnwrap(note(time: nil)).showsAge)
    }

    func testOnlyNoMatchAndErrorAreMisses() throws {
        XCTAssertTrue(try XCTUnwrap(note(outcome: "error")).isMiss)
        XCTAssertFalse(try XCTUnwrap(note(outcome: "delayed")).isMiss)
        XCTAssertFalse(try XCTUnwrap(note(outcome: "not_released")).isMiss)
        XCTAssertFalse(try XCTUnwrap(note(outcome: "grabbed")).isMiss)
    }

    func testNotReleasedHidesAge() throws {
        XCTAssertFalse(try XCTUnwrap(note(outcome: "not_released")).showsAge)
    }

    func testRecentMissesNewestFirstAndCapped() {
        struct Row { let id: Int; let outcome: String?; let time: String? }
        let rows = [
            Row(id: 1, outcome: "no_match", time: "2026-10-16T10:00:00Z"),
            Row(id: 2, outcome: "delayed", time: "2026-10-16T12:00:00Z"),
            Row(id: 3, outcome: "no_match", time: "2026-10-16T11:00:00Z"),
            Row(id: 4, outcome: "error", time: nil),
            Row(id: 5, outcome: nil, time: nil)
        ]
        let all = LastSearchNote.recentMisses(rows, limit: 10) {
            LastSearchNote(status: "wanted", outcome: $0.outcome, at: $0.time, reason: nil)
        }
        XCTAssertEqual(all.map(\.id), [3, 1, 4])
        let capped = LastSearchNote.recentMisses(rows, limit: 2) {
            LastSearchNote(status: "wanted", outcome: $0.outcome, at: $0.time, reason: nil)
        }
        XCTAssertEqual(capped.map(\.id), [3, 1])
    }
}

final class HomeDownloadsTests: XCTestCase {
    private func line(_ id: String, speed: Double, state: String = "downloading") -> HomeDownloadLine {
        HomeDownloadLine(id: id, title: id, progress: 0.5, speed: speed, etaSeconds: 60, state: state)
    }

    func testPhaseClassification() {
        XCTAssertEqual(DownloadPhase.classify("downloading"), .downloading)
        XCTAssertEqual(DownloadPhase.classify("stalledDL"), .downloading)
        XCTAssertEqual(DownloadPhase.classify("Importing"), .importing)
        XCTAssertEqual(DownloadPhase.classify("post_processing"), .importing)
        XCTAssertEqual(DownloadPhase.classify("seeding"), .seeding)
        XCTAssertEqual(DownloadPhase.classify("completed"), .seeding)
    }

    func testSeedingRowsAreLeftOut() {
        let summary = HomeDownloadsSummary.make([line("a", speed: 1), line("b", speed: 0, state: "seeding")], limit: 3)
        XCTAssertEqual(summary.shown.map(\.id), ["a"])
        XCTAssertEqual(summary.hiddenCount, 0)
    }

    func testCapsAndCountsTheRest() {
        let lines = (1 ... 6).map { line("r\($0)", speed: Double($0)) }
        let summary = HomeDownloadsSummary.make(lines, limit: 3)
        XCTAssertEqual(summary.shown.map(\.id), ["r6", "r5", "r4"])
        XCTAssertEqual(summary.hiddenCount, 3)
    }

    func testEqualSpeedsKeepQueueOrder() {
        let summary = HomeDownloadsSummary.make([line("a", speed: 0), line("b", speed: 0)], limit: 5)
        XCTAssertEqual(summary.shown.map(\.id), ["a", "b"])
    }

    func testEmpty() {
        XCTAssertTrue(HomeDownloadsSummary.make([], limit: 3).isEmpty)
        XCTAssertTrue(HomeDownloadsSummary.make([line("a", speed: 0, state: "seeding")], limit: 3).isEmpty)
    }
}
