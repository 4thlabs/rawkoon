@testable import RawkoonKit
import XCTest

final class ActivityLaneTests: XCTestCase {
    func testAdminsSeeFiveLanesInOrder() {
        XCTAssertEqual(ActivityLane.visible(isAdmin: true), [.inbox, .queue, .requests, .calendar, .history])
    }

    func testMembersDoNotSeeTheQueue() {
        XCTAssertEqual(ActivityLane.visible(isAdmin: false), [.inbox, .requests, .calendar, .history])
    }

    func testHiddenLaneFallsBackToInbox() {
        XCTAssertEqual(ActivityLane.validated(.queue, isAdmin: false), .inbox)
        XCTAssertEqual(ActivityLane.validated(.queue, isAdmin: true), .queue)
        XCTAssertEqual(ActivityLane.validated(.history, isAdmin: false), .history)
    }

    func testSearchGaveUpOffersSearchAgainToAdmins() {
        XCTAssertEqual(
            InboxAction.resolve(type: "library_grab_skipped", url: "/library/42?tab=files", isAdmin: true),
            .searchAgain(libraryId: 42, season: nil, episode: nil)
        )
        XCTAssertEqual(
            InboxAction.resolve(
                type: "library_grab_skipped", url: "/library/7?tab=files&season=2&episode=5", isAdmin: true
            ),
            .searchAgain(libraryId: 7, season: 2, episode: 5)
        )
    }

    func testSearchAgainNeedsAnAdminAndALibraryLink() {
        XCTAssertNil(InboxAction.resolve(type: "library_grab_skipped", url: "/library/42", isAdmin: false))
        XCTAssertNil(InboxAction.resolve(type: "library_grab_skipped", url: nil, isAdmin: true))
        XCTAssertNil(InboxAction.resolve(type: "library_grab_skipped", url: "/books/3", isAdmin: true))
    }

    func testPendingRequestOffersReviewToAdminsOnly() {
        XCTAssertEqual(InboxAction.resolve(type: "request_pending", url: "/activity/requests", isAdmin: true), .reviewRequests)
        XCTAssertNil(InboxAction.resolve(type: "request_pending", url: "/activity/requests", isAdmin: false))
    }

    func testOtherTypesOfferNothing() {
        XCTAssertNil(InboxAction.resolve(type: "library_media_downloaded", url: "/library/1", isAdmin: true))
    }

    private func line(_ state: String?, failed: Bool = false, reason: String? = nil, post: String? = nil) -> QueueStatusLine? {
        QueueClassifier.line(state: state, failed: failed, failReason: reason, postProcessError: post)
    }

    func testLiveStatesMapToPlainStatuses() {
        XCTAssertEqual(line("downloading")?.status, .downloading)
        XCTAssertEqual(line("downloading")?.reason, QueueReason.none)
        XCTAssertEqual(line("stalled")?.status, .stalled)
        XCTAssertEqual(line("stalled")?.reason, .noPeers)
        XCTAssertEqual(line("paused")?.status, .waiting)
        XCTAssertEqual(line("paused")?.reason, .paused)
        XCTAssertEqual(line("queuedDL")?.reason, .queued)
        XCTAssertEqual(line("checkingDL")?.reason, .checking)
        XCTAssertEqual(line("metaDL")?.reason, .fetchingMetadata)
        XCTAssertEqual(line("Importing")?.status, .importing)
        XCTAssertEqual(line("processing")?.status, .importing)
    }

    private func section(
        _ state: String?, failed: Bool = false, reason: String? = nil, post: String? = nil
    ) -> QueueSection? {
        QueueClassifier.section(state: state, failed: failed, failReason: reason, postProcessError: post)
    }

    func testFinishedDownloadsMoveToSeeding() {
        XCTAssertEqual(section("seeding"), .seeding)
        XCTAssertEqual(section("completed"), .seeding)
        XCTAssertNil(line("seeding"))
        XCTAssertNil(line("completed"))
    }

    func testInFlightDownloadsStayInTheQueue() {
        XCTAssertEqual(section("downloading"), .inFlight(QueueStatusLine(status: .downloading, reason: .none)))
        XCTAssertEqual(section("importing"), .inFlight(QueueStatusLine(status: .importing, reason: .importing)))
    }

    func testMissingFilesCountAsFailed() {
        XCTAssertEqual(line("missingFiles")?.status, .failed)
    }

    func testRowsTheClientForgotShowOnlyWhenTheyFailed() {
        XCTAssertNil(section(nil))
        XCTAssertNil(section(nil, post: "  "))
        XCTAssertEqual(section(nil, failed: true, reason: "Rejected"), .inFlight(
            QueueStatusLine(status: .failed, reason: .detail("Rejected"))
        ))
        XCTAssertEqual(section(nil, post: "Rename failed"), .inFlight(
            QueueStatusLine(status: .failed, reason: .detail("Rename failed"))
        ))
    }

    func testFailuresCarryTheServersReasonWhenThereIsOne() {
        XCTAssertEqual(line("error")?.status, .failed)
        XCTAssertEqual(line("error")?.reason, .clientError)
        XCTAssertEqual(line("downloading", failed: true, reason: "No space left")?.reason, .detail("No space left"))
        XCTAssertEqual(line("importing", failed: true, reason: "x", post: "Rename failed")?.reason, .detail("Rename failed"))
        XCTAssertEqual(line("downloading", failed: true, reason: "  ")?.reason, .clientError)
    }

    func testUnknownStatesCountAsDownloading() {
        XCTAssertEqual(line("allocating")?.status, .downloading)
    }
}
