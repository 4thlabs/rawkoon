@testable import RawkoonKit
import XCTest

/// Same table as the web's `heroRotation.test.ts`; change both together.
final class HeroRotationTests: XCTestCase {
    func testNextWrapsAndTolerates() {
        let table: [(Int, Int, Int)] = [
            (0, 5, 1), (3, 5, 4), (4, 5, 0), (0, 1, 0), (0, 0, 0), (7, 3, 0), (-2, 3, 1),
        ]
        for (current, count, expected) in table {
            XCTAssertEqual(HeroRotation.next(after: current, count: count), expected, "after \(current) of \(count)")
        }
    }

    func testClampKeepsIndexValid() {
        let table: [(Int, Int, Int)] = [
            (2, 5, 2), (4, 3, 2), (-1, 3, 0), (3, 0, 0), (0, 1, 0),
        ]
        for (index, count, expected) in table {
            XCTAssertEqual(HeroRotation.clamp(index, count: count), expected, "index \(index) of \(count)")
        }
    }

    func testPreviousWrapsAndTolerates() {
        let table: [(Int, Int, Int)] = [(0, 5, 4), (3, 5, 2), (0, 1, 0), (0, 0, 0), (7, 3, 1), (-2, 3, 2)]
        for (current, count, expected) in table {
            XCTAssertEqual(HeroRotation.previous(before: current, count: count), expected, "\(current)/\(count)")
        }
    }

    func testSwipeDecidesDirectionAndIgnoresScrolls() {
        let table: [(Int, Int, Double, Double, Int?)] = [
            (1, 5, -80, 10, 2), (1, 5, 80, 10, 0), (4, 5, -80, 0, 0), (0, 5, 80, 0, 4),
            (1, 5, -30, 0, nil), (1, 5, -80, 90, nil), (0, 1, -80, 0, nil),
        ]
        for (current, count, dx, dy, expected) in table {
            XCTAssertEqual(
                HeroRotation.swipe(from: current, count: count, dx: dx, dy: dy), expected,
                "\(current)/\(count) dx \(dx) dy \(dy)"
            )
        }
    }
}
