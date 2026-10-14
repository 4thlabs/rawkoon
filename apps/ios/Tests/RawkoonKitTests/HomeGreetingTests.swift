@testable import RawkoonKit
import XCTest

/// Same table as the web's `greeting.test.ts`; change both together.
final class HomeGreetingTests: XCTestCase {
    func testPeriodBoundaries() {
        let table: [(Int, HomeGreeting.Period)] = [
            (4, .night), (5, .morning), (11, .morning), (12, .afternoon), (17, .afternoon),
            (18, .evening), (22, .evening), (23, .night), (0, .night),
        ]
        for (hour, period) in table {
            XCTAssertEqual(HomeGreeting.period(hour: hour), period, "hour \(hour)")
        }
    }

    func testLateNightWinsOverWeekend() {
        XCTAssertEqual(HomeGreeting.subtitle(hour: 2, weekday: 7), .night)
    }

    func testDayFlavours() {
        XCTAssertEqual(HomeGreeting.subtitle(hour: 10, weekday: 7), .weekend)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 15, weekday: 1), .weekend)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 9, weekday: 2), .monday)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 6, weekday: 2), .monday)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 6, weekday: 7), .weekend)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 19, weekday: 6), .friday)
    }

    func testMidweekFallsBackToPeriod() {
        XCTAssertEqual(HomeGreeting.subtitle(hour: 6, weekday: 4), .earlyMorning)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 7, weekday: 4), .earlyMorning)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 8, weekday: 4), .morning)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 9, weekday: 4), .lateMorning)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 11, weekday: 4), .lateMorning)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 14, weekday: 4), .afternoon)
        XCTAssertEqual(HomeGreeting.subtitle(hour: 20, weekday: 4), .evening)
    }
}
