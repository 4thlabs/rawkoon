@testable import Rawkoon
import Testing

@MainActor
struct ActivityViewSplitRegressionTests {
    @Test func laneStateKeepsRowsVisibleDuringRefreshAndFailure() {
        #expect(ActivityView.laneState(loading: true, failed: false, isEmpty: false) == .list)
        #expect(ActivityView.laneState(loading: false, failed: true, isEmpty: false) == .list)
        #expect(ActivityView.laneState(loading: true, failed: false, isEmpty: true) == .loading)
        #expect(ActivityView.laneState(loading: false, failed: true, isEmpty: true) == .failed)
        #expect(ActivityView.laneState(loading: false, failed: false, isEmpty: true) == .empty)
    }
}
