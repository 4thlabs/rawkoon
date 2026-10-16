@testable import RawkoonKit
import XCTest

final class LiveSearchToastTests: XCTestCase {
    private let t0 = Date(timeIntervalSince1970: 1_000_000)

    private func tracker(isShow: Bool = false) -> LiveSearchTracker {
        var tracker = LiveSearchTracker()
        tracker.start(mediaId: 7, title: "Title", isShow: isShow, now: t0)
        return tracker
    }

    func testStartShowsSearching() {
        var tracker = LiveSearchTracker()
        let update = tracker.start(mediaId: 7, title: "Title", isShow: false, now: t0)
        XCTAssertEqual(update.phase, .searching)
        XCTAssertEqual(update.title, "Title")
    }

    func testUntrackedResultIsIgnored() {
        var tracker = LiveSearchTracker()
        XCTAssertNil(tracker.apply(LiveSearchResult(mediaId: 7, outcome: .noMatch), now: t0))
    }

    func testNoMatchOffersChooseRelease() {
        var tracker = tracker()
        let update = tracker.apply(LiveSearchResult(mediaId: 7, outcome: .noMatch), now: t0)
        XCTAssertEqual(update?.phase, .noMatch)
        XCTAssertEqual(update?.phase.action, .chooseRelease)
        XCTAssertEqual(update?.phase.lifetime, 10)
    }

    func testGrabbedShortensTitleAndBuildsQuality() {
        var tracker = tracker()
        let result = LiveSearchResult(
            mediaId: 7, outcome: .grabbed, releaseTitle: "Some.Movie.2024.1080p.WEB-DL-GRP",
            resolution: 1080, source: "WEB-DL"
        )
        XCTAssertEqual(
            tracker.apply(result, now: t0)?.phase, .grabbed(release: "Some Movie 2024", quality: "1080p WEB-DL")
        )
    }

    func testGrabbedWithoutReleaseIsPlain() {
        var tracker = tracker()
        XCTAssertEqual(
            tracker.apply(LiveSearchResult(mediaId: 7, outcome: .grabbed), now: t0)?.phase,
            .grabbed(release: nil, quality: nil)
        )
    }

    func testHeldCarriesMinutesAndAllTargetKeys() {
        var tracker = tracker()
        let until = ISO8601DateFormatter().string(from: t0.addingTimeInterval(29 * 60 + 10))
        let result = LiveSearchResult(
            mediaId: 7, outcome: .delayed, delayUntil: until, targetKeys: ["a", "b"]
        )
        let phase = tracker.apply(result, now: t0)?.phase
        XCTAssertEqual(phase, .held(minutes: 30, targetKeys: ["a", "b"]))
        XCTAssertEqual(phase?.action, .grabNow(targetKeys: ["a", "b"]))
    }

    func testHeldWithoutKeysOffersNoAction() {
        XCTAssertEqual(LiveSearchPhase.held(minutes: 5, targetKeys: []).action, LiveSearchPhase.Action.none)
    }

    func testLowerRankAfterSettlingIsIgnored() {
        var tracker = tracker(isShow: true)
        XCTAssertNotNil(tracker.apply(LiveSearchResult(mediaId: 7, season: 1, outcome: .grabbed), now: t0))
        XCTAssertNil(tracker.apply(LiveSearchResult(mediaId: 7, season: 2, outcome: .noMatch), now: t0))
    }

    func testEqualRankDuplicateFromResponseAndStreamIsIgnored() {
        var tracker = tracker()
        let result = LiveSearchResult(mediaId: 7, outcome: .noMatch)
        XCTAssertNotNil(tracker.apply(result, now: t0))
        XCTAssertNil(tracker.apply(result, now: t0))
    }

    func testHigherRankUpgradesTheToast() {
        var tracker = tracker(isShow: true)
        XCTAssertNotNil(tracker.apply(LiveSearchResult(mediaId: 7, season: 1, outcome: .noMatch), now: t0))
        XCTAssertEqual(
            tracker.apply(LiveSearchResult(mediaId: 7, season: 2, outcome: .grabbed), now: t0)?.phase,
            .grabbed(release: nil, quality: nil)
        )
    }

    func testRestartAllowsANewSearchToSettleAgain() {
        var tracker = tracker()
        _ = tracker.apply(LiveSearchResult(mediaId: 7, outcome: .grabbed), now: t0)
        tracker.start(mediaId: 7, title: "Title", isShow: false, now: t0)
        XCTAssertNotNil(tracker.apply(LiveSearchResult(mediaId: 7, outcome: .noMatch), now: t0))
    }

    func testNotReleasedKeepsTheDay() {
        var tracker = tracker()
        let result = LiveSearchResult(mediaId: 7, outcome: .notReleased, delayUntil: "2026-11-03T00:00:00.000Z")
        XCTAssertEqual(tracker.apply(result, now: t0)?.phase, .notReleased(ymd: "2026-11-03"))
    }

    func testErrorCarriesReason() {
        var tracker = tracker()
        let update = tracker.apply(LiveSearchResult(mediaId: 7, outcome: .error, reason: "boom"), now: t0)
        XCTAssertEqual(update?.phase, .failed(reason: "boom"))
    }

    func testStillSearchingOnlyWhileUnsettled() {
        var waiting = tracker()
        XCTAssertEqual(waiting.giveUpWaiting(mediaId: 7, now: t0)?.phase, .stillSearching)
        var settled = tracker()
        _ = settled.apply(LiveSearchResult(mediaId: 7, outcome: .noMatch), now: t0)
        XCTAssertNil(settled.giveUpWaiting(mediaId: 7, now: t0))
    }

    func testResultStillLandsAfterStillSearching() {
        var tracker = tracker()
        _ = tracker.giveUpWaiting(mediaId: 7, now: t0)
        XCTAssertNotNil(tracker.apply(LiveSearchResult(mediaId: 7, outcome: .error), now: t0))
    }

    func testGrabNoticeSuppressedWhileSearchingAndForGraceAfterwards() {
        var movie = tracker()
        XCTAssertTrue(movie.suppressesGrabNotice(mediaId: 7, now: t0.addingTimeInterval(60)))
        XCTAssertFalse(movie.suppressesGrabNotice(mediaId: 7, now: t0.addingTimeInterval(121)))
        _ = movie.apply(LiveSearchResult(mediaId: 7, outcome: .grabbed), now: t0.addingTimeInterval(5))
        XCTAssertTrue(movie.suppressesGrabNotice(mediaId: 7, now: t0.addingTimeInterval(20)))
        XCTAssertFalse(movie.suppressesGrabNotice(mediaId: 7, now: t0.addingTimeInterval(26)))
        XCTAssertFalse(movie.suppressesGrabNotice(mediaId: 8, now: t0))
    }

    func testShowGraceIsLonger() {
        var show = tracker(isShow: true)
        _ = show.apply(LiveSearchResult(mediaId: 7, outcome: .grabbed), now: t0)
        XCTAssertTrue(show.suppressesGrabNotice(mediaId: 7, now: t0.addingTimeInterval(100)))
        XCTAssertFalse(show.suppressesGrabNotice(mediaId: 7, now: t0.addingTimeInterval(121)))
    }

    func testPruneDropsExpiredEntries() {
        var tracker = tracker()
        tracker.prune(now: t0.addingTimeInterval(500))
        XCTAssertFalse(tracker.isTracking(7))
    }

    func testWatchTracksWithoutAToast() {
        var tracker = LiveSearchTracker()
        tracker.watch(mediaId: 7, title: "Title", isShow: false, now: t0)
        XCTAssertEqual(tracker.apply(LiveSearchResult(mediaId: 7, outcome: .noMatch), now: t0)?.phase, .noMatch)
    }

    func testSkippedPhasesAndActions() {
        XCTAssertEqual(LiveSearchTracker.phase(skipped: "setting_off", digitalReleaseDate: nil).action, .searchNow)
        XCTAssertEqual(LiveSearchTracker.phase(skipped: "not_monitored", digitalReleaseDate: nil).action, .none)
        XCTAssertEqual(
            LiveSearchTracker.phase(skipped: "not_released", digitalReleaseDate: "2026-11-03"),
            .skipped(.notReleased(ymd: "2026-11-03"))
        )
        XCTAssertEqual(LiveSearchTracker.phase(skipped: nil, digitalReleaseDate: nil), .added)
    }

    func testShortReleaseTitleTruncatesAndFallsBack() {
        XCTAssertEqual(LiveSearchTracker.shortReleaseTitle("1080p.Weird"), "1080p.Weird")
        let long = String(repeating: "Word ", count: 20) + "1080p"
        XCTAssertTrue(LiveSearchTracker.shortReleaseTitle(long).hasSuffix("…"))
        XCTAssertLessThanOrEqual(LiveSearchTracker.shortReleaseTitle(long).count, 44)
    }
}
