@testable import RawkoonKit
import XCTest

final class NotificationBadgeTests: XCTestCase {
    func testZeroWhenNoUnread() {
        XCTAssertEqual(NotificationBadge.value(forUnread: 0), 0)
    }

    func testPassesThroughUnderCap() {
        XCTAssertEqual(NotificationBadge.value(forUnread: 7), 7)
    }

    func testClampsNegativeToZero() {
        XCTAssertEqual(NotificationBadge.value(forUnread: -3), 0)
    }

    func testCapsRunawayCount() {
        XCTAssertEqual(NotificationBadge.value(forUnread: 5000, cap: 99), 99)
    }

    func testLabelIsNilWithNothingUnread() {
        XCTAssertNil(NotificationBadge.label(forUnread: 0))
        XCTAssertNil(NotificationBadge.label(forUnread: -2))
    }

    func testLabelShowsSingleDigits() {
        XCTAssertEqual(NotificationBadge.label(forUnread: 1), "1")
        XCTAssertEqual(NotificationBadge.label(forUnread: 9), "9")
    }

    /// The tab-bar badge is a small capsule; two digits and up read "9+".
    func testLabelCapsAtNinePlus() {
        XCTAssertEqual(NotificationBadge.label(forUnread: 10), "9+")
        XCTAssertEqual(NotificationBadge.label(forUnread: 5000), "9+")
    }
}

final class ActivityBadgeTests: XCTestCase {
    func testAdminsCountPendingRequestsOnTopOfUnread() {
        XCTAssertEqual(NotificationBadge.activityCount(unread: 3, pendingRequests: 2, isAdmin: true), 5)
    }

    func testMembersCountUnreadOnly() {
        XCTAssertEqual(NotificationBadge.activityCount(unread: 3, pendingRequests: 2, isAdmin: false), 3)
    }

    func testNegativeInputsNeverSubtract() {
        XCTAssertEqual(NotificationBadge.activityCount(unread: -1, pendingRequests: 4, isAdmin: true), 4)
    }
}
