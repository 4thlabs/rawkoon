import Foundation
@testable import Rawkoon
import Testing

struct LibraryGrowthModelsTests {
    private static func json(bytes withBytes: Bool) -> String {
        func period(_ start: String, _ m: Int, _ e: Int, _ b: Int, _ u: Int, _ size: Int?) -> String {
            let text = withBytes ? (size.map(String.init) ?? "null") : "null"
            return #"{"start":"\#(start)","movies":\#(m),"episodes":\#(e),"books":\#(b),"upgrades":\#(u),"bytes":\#(text)}"#
        }
        let weeks = (0 ..< 12).map { period("2026-07-\(String(format: "%02d", 6 + $0))", $0, 2 * $0, 0, 0, $0 * 1_000_000) }
        return """
        {"growth":{"timezone":"UTC",
        "month":\(period("2026-10-01", 1, 32, 0, 0, 42_200_000_000)),
        "previous_to_date":\(period("2026-09-01", 3, 88, 2, 1, 129_000_000_000)),
        "previous_month":\(period("2026-09-01", 18, 115, 7, 1, 330_700_000_000)),
        "weeks":[\(weeks.joined(separator: ","))],
        "since":"2026-04-07"}}
        """
    }

    private func decode(_ text: String) throws -> LibraryGrowth {
        try APIClient.mediaDecoder.decode(LibraryGrowthResponse.self, from: Data(text.utf8)).growth
    }

    @Test func decodesAdminPayloadWithBytes() throws {
        let g = try decode(Self.json(bytes: true))
        #expect(g.month.bytes == 42_200_000_000)
        #expect(g.previousToDate.start == "2026-09-01")
        #expect(g.previousMonth.books == 7)
        #expect(g.weeks.count == 12)
        #expect(g.since == "2026-04-07")
        #expect(g.month.titles == 33)
        #expect(g.month.metric(admin: true) == 42_200_000_000)
        #expect(g.month.metric(admin: false) == 33)
        #expect(!g.isEmpty)
    }

    @Test func decodesMemberPayloadWithNullBytes() throws {
        let g = try decode(Self.json(bytes: false))
        #expect(g.month.bytes == nil)
        #expect(g.weeks.allSatisfy { $0.bytes == nil })
        #expect(g.month.metric(admin: true) == 0)
    }

    @Test func nullSinceAndEmptyMonthIsEmpty() throws {
        let zero = #"{"start":"2026-10-01","movies":0,"episodes":0,"books":0,"upgrades":0,"bytes":null}"#
        let weeks = Array(repeating: zero, count: 12).joined(separator: ",")
        let g = try decode(
            #"{"growth":{"timezone":"UTC","month":\#(zero),"previous_to_date":\#(zero),"previous_month":\#(zero),"weeks":[\#(weeks)],"since":null}}"#
        )
        #expect(g.since == nil)
        #expect(g.isEmpty)
    }

    @Test func weeksBeforeSinceHaveNoData() {
        #expect(GrowthDates.isBeforeSince(weekStart: "2026-07-27", since: "2026-08-02") == false)
        #expect(GrowthDates.isBeforeSince(weekStart: "2026-07-20", since: "2026-08-02"))
        #expect(GrowthDates.isBeforeSince(weekStart: "2026-07-20", since: nil))
    }

    @Test func monthNameIsLocalised() {
        #expect(GrowthDates.monthName("2026-10-01", locale: Locale(identifier: "en_US")) == "October")
        #expect(GrowthDates.monthName("2026-10-01", locale: Locale(identifier: "fr_CA")) == "octobre")
    }
}
