@testable import RawkoonKit
import XCTest

final class RootTabTests: XCTestCase {
    func testPhoneBarHoldsSixTabsInOrder() {
        XCTAssertEqual(RootTab.phone, [.home, .library, .books, .find, .activity, .settings])
    }

    func testSidebarListsLooseTabsThenLibraryAndSettings() {
        XCTAssertEqual(RootTab.sidebar, [.home, .find, .activity, .library, .books, .settings, .server])
    }

    func testServerIsAdminOnly() {
        XCTAssertTrue(RootTab.visibleSidebar(isAdmin: true).contains(.server))
        XCTAssertFalse(RootTab.visibleSidebar(isAdmin: false).contains(.server))
        XCTAssertEqual(RootTab.visibleSidebar(isAdmin: false).count, RootTab.sidebar.count - 1)
    }

    func testPhoneNeverShowsServer() {
        XCTAssertFalse(RootTab.phone.contains(.server))
    }

    func testStaleServerPickFallsBackToHomeForNonAdmins() {
        XCTAssertEqual(RootTab.validated("server", compact: false, isAdmin: false), .home)
        XCTAssertEqual(RootTab.validated("server", compact: false, isAdmin: true), .server)
        XCTAssertEqual(RootTab.validated("server", compact: true), .home)
    }

    func testEveryPhoneTabSurvivesValidationOnPhone() {
        for tab in RootTab.phone {
            XCTAssertEqual(RootTab.validated(tab.rawValue, compact: true), tab)
        }
    }

    func testBooksTabFollowsTheFeatureFlag() {
        XCTAssertFalse(RootTab.phoneTabs(booksEnabled: false).contains(.books))
        XCTAssertEqual(RootTab.phoneTabs(booksEnabled: true), RootTab.phone)
        XCTAssertFalse(RootTab.visibleSidebar(isAdmin: true, booksEnabled: false).contains(.books))
        XCTAssertTrue(RootTab.visibleSidebar(isAdmin: true, booksEnabled: true).contains(.books))
    }

    func testStaleBooksSelectionFallsBackToHomeWhenDisabled() {
        XCTAssertEqual(RootTab.validated("books", compact: true, booksEnabled: false), .home)
        XCTAssertEqual(RootTab.validated("books", compact: false, booksEnabled: false), .home)
        XCTAssertEqual(RootTab.validated("books", compact: true, booksEnabled: true), .books)
        XCTAssertEqual(RootTab.validated("library", compact: true, booksEnabled: false), .library)
    }

    func testRetiredBrowseTabsLandOnFind() {
        for raw in ["discover", "explore", "watchlist"] {
            XCTAssertEqual(RootTab.validated(raw, compact: true), .find, raw)
            XCTAssertEqual(RootTab.validated(raw, compact: false), .find, raw)
        }
    }

    func testRetiredInboxTabsLandOnActivity() {
        for raw in ["notifications", "requests"] {
            XCTAssertEqual(RootTab.validated(raw, compact: true), .activity, raw)
            XCTAssertEqual(RootTab.validated(raw, compact: false), .activity, raw)
        }
    }

    /// Home is the landing tab, so every fallback lands there.
    func testUnknownValueFallsBackToHome() {
        XCTAssertEqual(RootTab.validated("nope", compact: true), .home)
        XCTAssertEqual(RootTab.validated("", compact: false), .home)
    }

    func testDebugSelectionAcceptsTabNamesIncludingRetiredOnes() {
        XCTAssertEqual(RootTab.debugSelection("activity"), .activity)
        XCTAssertEqual(RootTab.debugSelection("notifications"), .activity)
        XCTAssertEqual(RootTab.debugSelection("explore"), .find)
    }

    /// Existing screenshot scripts pass the old five-tab indices; Discover's slot now opens Find.
    func testDebugSelectionKeepsTheLegacyIndices() {
        XCTAssertEqual(RootTab.debugSelection("0"), .home)
        XCTAssertEqual(RootTab.debugSelection("3"), .find)
        XCTAssertEqual(RootTab.debugSelection("4"), .settings)
        XCTAssertNil(RootTab.debugSelection("9"))
        XCTAssertNil(RootTab.debugSelection("bogus"))
    }
}
