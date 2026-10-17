import Foundation
@testable import RawkoonKit
import XCTest

final class DashboardPipelineTests: XCTestCase {
    func testDecodesSnakeCaseAndUnavailableBlock() throws {
        let json = #"{"downloading":{"available":true,"count":1,"speed_bytes_per_sec":2048,"items":[{"id":7,"library_media_id":42,"book_id":null,"title":"Film","progress":0.4,"eta_seconds":90}]},"delayed":{"available":false,"count":0},"attention":{"available":true,"count":2,"alerts":1,"gave_up":1},"rss":{"available":true,"last_run_at":"2026-10-16T12:00:00Z","ok":false,"releases_found":3,"next_run_at":null},"reencode":{"available":true,"active":1,"queued":2}}"#
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let pipeline = try decoder.decode(DashboardPipeline.self, from: Data(json.utf8))
        XCTAssertEqual(pipeline.downloading.items.first?.libraryMediaId, 42)
        XCTAssertEqual(pipeline.downloading.items.first?.etaSeconds, 90)
        XCTAssertFalse(pipeline.delayed.available)
        XCTAssertEqual(pipeline.attention.gaveUp, 1)
        XCTAssertEqual(pipeline.rss.ok, false)
        XCTAssertEqual(pipeline.reencode.queued, 2)
    }
}
