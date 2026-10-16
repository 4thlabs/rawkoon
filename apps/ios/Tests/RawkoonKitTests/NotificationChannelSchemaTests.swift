@testable import RawkoonKit
import XCTest

final class NotificationChannelSchemaTests: XCTestCase {
    /// Mirrors the web form defaults (`emptyConfig`) and the server `parse<Type>Config` readers.
    private let serverKeys: [String: [String]] = [
        "ntfy": ["url", "topic", "token", "priority"],
        "telegram": ["bot_token", "chat_id"],
        "discord": ["webhook_url"],
        "gotify": ["url", "token", "priority"],
        "pushover": ["token", "user"],
        "slack": ["webhook_url"],
        "webhook": ["url", "method", "body_template"]
    ]

    func testEveryTypeWritesExactlyTheKeysTheServerReads() {
        XCTAssertEqual(Set(NotificationChannelSchema.typeIds), Set(serverKeys.keys))
        for (type, keys) in serverKeys {
            XCTAssertEqual(NotificationChannelSchema.fields(for: type).map(\.key), keys, type)
        }
    }

    func testLegacyKeysMoveOntoTheCurrentOnes() {
        let ntfy = NotificationChannelSchema.upgradingLegacyKeys(
            ["server_url": "https://n", "topic": "t", "access_token": "x"], type: "ntfy")
        XCTAssertEqual(ntfy, ["url": "https://n", "topic": "t", "token": "x"])
        let pushover = NotificationChannelSchema.upgradingLegacyKeys(
            ["api_token": "a", "user_key": "u"], type: "pushover")
        XCTAssertEqual(pushover, ["token": "a", "user": "u"])
        let gotify = NotificationChannelSchema.upgradingLegacyKeys(
            ["server_url": "g", "app_token": "k"], type: "gotify")
        XCTAssertEqual(gotify, ["url": "g", "token": "k"])
    }

    func testCurrentKeysWinOverLegacyOnes() {
        let result = NotificationChannelSchema.upgradingLegacyKeys(
            ["url": "new", "server_url": "old"], type: "gotify")
        XCTAssertEqual(result["url"], "new")
        XCTAssertNil(result["server_url"])
    }
}
