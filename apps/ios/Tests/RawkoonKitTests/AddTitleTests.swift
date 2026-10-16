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
        let t0 = Date(timeIntervalSince1970: 1000)
        XCTAssertEqual(gate.rotationDelay(at: t0), HeroRotation.rotateSeconds)
        gate.touchBegan(at: t0)
        XCTAssertNil(gate.rotationDelay(at: t0.addingTimeInterval(60)))
    }

    func testHeroWaitsAfterTheFingerLifts() {
        var gate = HeroInteractionGate()
        let t0 = Date(timeIntervalSince1970: 1000)
        gate.touchBegan(at: t0)
        gate.touchEnded(at: t0.addingTimeInterval(2))
        XCTAssertEqual(gate.rotationDelay(at: t0.addingTimeInterval(2)), HeroInteractionGate.resumeAfter)
        XCTAssertEqual(gate.rotationDelay(at: t0.addingTimeInterval(12)), HeroRotation.rotateSeconds)
    }
}
