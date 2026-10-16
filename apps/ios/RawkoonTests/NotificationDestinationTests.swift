@testable import Rawkoon
import RawkoonKit
import Testing

@MainActor
struct NotificationDestinationTests {
    @Test func settingsPathsRouteToTheirScreens() {
        #expect(NotificationDestination.resolve(url: "/settings/reencode") == .reencode)
        #expect(NotificationDestination.resolve(url: "/settings/alerts") == .alerts)
        #expect(NotificationDestination.resolve(url: "/settings/updates") == .updates)
    }

    @Test func legacySettingsTabsStillRoute() {
        #expect(NotificationDestination.resolve(url: "/settings?tab=transcode") == .reencode)
        #expect(NotificationDestination.resolve(url: "/settings?tab=users") == nil)
        #expect(NotificationDestination.resolve(url: "/settings") == nil)
    }

    @Test func activityPathsRoute() {
        #expect(NotificationDestination.resolve(url: "/activity/requests") == .requests)
        #expect(NotificationDestination.resolve(url: "/requests") == .requests)
        #expect(NotificationDestination.resolve(url: "/activity/calendar?date=2026-10-16") == .calendar(date: "2026-10-16"))
    }

    @Test func tabContentDestinationsNameTheirHostTab() {
        #expect(NotificationDestination.inbox.hostTab == .activity)
        #expect(NotificationDestination.calendar(date: nil).hostTab == .activity)
        #expect(NotificationDestination.watchlist.hostTab == .find)
        #expect(NotificationDestination.requests.hostTab == nil)
    }
}
