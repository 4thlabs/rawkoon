import Foundation
@testable import RawkoonKit
import XCTest

final class AddTitleTests: XCTestCase {
    func testStandardAddFollowsTheServerSetting() {
        XCTAssertNil(AddMode.standard.searchOnAdd)
        XCTAssertEqual(AddMode.chooseRelease.searchOnAdd, false)
        XCTAssertEqual(AddMode.withoutSearching.searchOnAdd, false)
        XCTAssertTrue(AddMode.chooseRelease.opensReleaseSheet)
        XCTAssertFalse(AddMode.withoutSearching.opensReleaseSheet)
    }

    func testResultActionByRole() {
        func resolve(
            inLibrary: Bool = false, canAdd: Bool = true, isAdmin: Bool,
            added: Bool = false, requested: Bool = false
        ) -> SearchResultAction {
            .resolve(inLibrary: inLibrary, canAdd: canAdd, isAdmin: isAdmin, addedHere: added, requestedHere: requested)
        }
        XCTAssertEqual(resolve(isAdmin: true), .add)
        XCTAssertEqual(resolve(isAdmin: false), .request)
        XCTAssertEqual(resolve(inLibrary: true, isAdmin: true), .inLibrary)
        XCTAssertEqual(resolve(isAdmin: true, added: true), .inLibrary)
        XCTAssertEqual(resolve(isAdmin: false, requested: true), .requested)
        XCTAssertEqual(resolve(canAdd: false, isAdmin: true), .none)
        XCTAssertTrue(SearchResultAction.add.offersAddModes)
        XCTAssertFalse(SearchResultAction.request.offersAddModes)
    }

    func testHeroStaysPutUnderAFinger() {
        var gate = HeroInteractionGate()
        let start = Date(timeIntervalSince1970: 1000)
        XCTAssertEqual(gate.rotationDelay(at: start), HeroRotation.rotateSeconds)
        gate.touchBegan(at: start)
        XCTAssertNil(gate.rotationDelay(at: start.addingTimeInterval(60)))
    }

    func testAStaleTouchCountsAsReleased() {
        var gate = HeroInteractionGate()
        let start = Date(timeIntervalSince1970: 1000)
        gate.touchBegan(at: start)
        XCTAssertTrue(gate.isTouching(at: start.addingTimeInterval(HeroInteractionGate.touchTimeout - 1)))
        let stale = start.addingTimeInterval(HeroInteractionGate.touchTimeout + 1)
        XCTAssertFalse(gate.isTouching(at: stale))
        XCTAssertNotNil(gate.rotationDelay(at: stale))
    }

    func testHeroWaitsAfterTheFingerLifts() {
        var gate = HeroInteractionGate()
        let start = Date(timeIntervalSince1970: 1000)
        gate.touchBegan(at: start)
        gate.touchEnded(at: start.addingTimeInterval(2))
        XCTAssertEqual(gate.rotationDelay(at: start.addingTimeInterval(2)), HeroInteractionGate.resumeAfter)
        XCTAssertEqual(gate.rotationDelay(at: start.addingTimeInterval(12)), HeroRotation.rotateSeconds)
    }
}
