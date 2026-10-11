@testable import Rawkoon
import Testing

@MainActor
struct ActivityViewSplitRegressionTests {
    @Test func queuePhaseRecognizesLiveDownloadStates() {
        let view = ActivityView()
        #expect(view.phase(of: "Downloading") == .downloading)
        #expect(view.phase(of: "Importing") == .importing)
        #expect(view.phase(of: "processing") == .importing)
        #expect(view.phase(of: "seeding") == .seeding)
        #expect(view.phase(of: "Completed") == .seeding)
        #expect(view.phase(of: "queued") == .downloading)
    }

    @Test func laneStateKeepsRowsVisibleDuringRefreshAndFailure() {
        #expect(ActivityView.laneState(loading: true, failed: false, isEmpty: false) == .list)
        #expect(ActivityView.laneState(loading: false, failed: true, isEmpty: false) == .list)
        #expect(ActivityView.laneState(loading: true, failed: false, isEmpty: true) == .loading)
        #expect(ActivityView.laneState(loading: false, failed: true, isEmpty: true) == .failed)
        #expect(ActivityView.laneState(loading: false, failed: false, isEmpty: true) == .empty)
    }
}
