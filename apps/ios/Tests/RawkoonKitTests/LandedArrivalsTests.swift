@testable import RawkoonKit
import XCTest

/// Same table as the web's `landedArrivals.test.ts`; change both together.
final class LandedArrivalsTests: XCTestCase {
    private let minute = 60000
    private let now = 1_000_000_000_000

    private func arrival(_ mediaId: Int, _ ts: Int) -> LandedArrival {
        LandedArrival(
            mediaId: mediaId, mediaType: "movie", title: "Title \(mediaId)", posterUrl: nil,
            season: nil, episode: nil, episodeCount: nil, ts: ts
        )
    }

    func testInsertPutsNewestFirst() {
        let list = LandedArrivals.insert([arrival(1, now - minute)], arrival(2, now), now: now)
        XCTAssertEqual(list.map(\.mediaId), [2, 1])
    }

    func testInsertReplacesOlderArrivalOfSameMedia() {
        let list = LandedArrivals.insert(
            [arrival(1, now - 2 * minute), arrival(2, now - minute)], arrival(1, now), now: now
        )
        XCTAssertEqual(list.map(\.mediaId), [1, 2])
        XCTAssertEqual(list.first?.ts, now)
    }

    func testInsertDropsEntriesOlderThanThirtyMinutes() {
        let list = LandedArrivals.insert(
            [arrival(1, now - 31 * minute), arrival(2, now - 29 * minute)], arrival(3, now), now: now
        )
        XCTAssertEqual(list.map(\.mediaId), [3, 2])
    }

    func testInsertCapsAtTen() {
        var list: [LandedArrival] = []
        for id in 1 ... 12 {
            list = LandedArrivals.insert(list, arrival(id, now), now: now)
        }
        XCTAssertEqual(list.count, 10)
        XCTAssertEqual(list.first?.mediaId, 12)
    }

    func testFreshKeepsOnlyNonExpired() {
        let list = LandedArrivals.fresh([arrival(1, now - 30 * minute), arrival(2, now - 30 * minute + 1)], now: now)
        XCTAssertEqual(list.map(\.mediaId), [2])
    }

    func testEpisodeCode() {
        let table: [(Int?, Int?, String)] = [(1, 4, "S01E04"), (12, 10, "S12E10"), (2, nil, "S02"), (nil, nil, "")]
        for (season, episode, code) in table {
            XCTAssertEqual(LandedArrivals.episodeCode(season: season, episode: episode), code)
        }
    }

    func testReceivedRestampsOnlyTheTime() {
        let a = LandedArrival(mediaId: 1, mediaType: "tv", title: "Show", posterUrl: "/p.jpg",
                              season: 1, episode: 4, episodeCount: nil, ts: 5)
        let r = a.received(at: 99)
        XCTAssertEqual(r.ts, 99)
        XCTAssertEqual(r.title, "Show")
        XCTAssertEqual(r.code, "S01E04")
    }

    func testDisplayedKeepsTheEventPosterWhenTheRowHasNone() {
        let a = LandedArrival(mediaId: 1, mediaType: "movie", title: "Film", posterUrl: "/p.jpg",
                              season: nil, episode: nil, episodeCount: nil, ts: 5)
        let d = a.displayed(title: "Le film", posterUrl: nil)
        XCTAssertEqual(d.title, "Le film")
        XCTAssertEqual(d.posterUrl, "/p.jpg")
        XCTAssertEqual(d.ts, 5)
    }
}
