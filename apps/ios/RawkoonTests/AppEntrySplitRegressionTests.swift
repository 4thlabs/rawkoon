@testable import Rawkoon
import Testing
import UIKit

@MainActor
struct AppEntrySplitRegressionTests {
    @Test func appDelegateLaunchesAndKeepsUIApplicationDelegateConformance() {
        let delegate: any UIApplicationDelegate = AppDelegate()
        #expect(delegate is AppDelegate)
    }

    @Test func miniPlayerInsetIsStable() {
        #expect(MiniPlayerInset.height == 76)
    }

    @Test func rootTabsViewIsConstructible() {
        _ = RootTabsView()
    }
}
