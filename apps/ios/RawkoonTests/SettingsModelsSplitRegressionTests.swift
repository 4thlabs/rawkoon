import Foundation
@testable import Rawkoon
import Testing

struct SettingsModelsSplitRegressionTests {
    @Test func customFormatConditionsKeepTheirWireShapes() throws {
        let conditions = [
            ConditionEncodable(type: "resolution", op: "greater_than", stringValue: "1080", negate: false),
            ConditionEncodable(type: "size_range", op: "between", stringValue: "1, 4", negate: true),
            ConditionEncodable(type: "hdr", op: "is_true", stringValue: "ignored", negate: false),
            ConditionEncodable(type: "source", op: "equals", stringValue: "BluRay", negate: false),
        ]
        let encoded = try JSONEncoder().encode(conditions)
        let rows = try #require(JSONSerialization.jsonObject(with: encoded) as? [[String: Any]])

        #expect(rows[0]["value"] as? Double == 1080)
        #expect(rows[1]["value"] as? [Double] == [1, 4])
        #expect(rows[1]["negate"] as? Bool == true)
        #expect(rows[2]["value"] == nil)
        #expect(rows[3]["value"] as? String == "BluRay")
    }

    @Test func bookQualityProfileSendsExplicitNulls() throws {
        let body = SaveBookQualityProfileBody(
            name: "Books", kind: "ebook", allowedFormats: ["epub"],
            cutoffFormat: nil, preferRetail: true, maxSizeMb: nil,
            minSeeders: 2, minAudioBitrate: nil, preferredLanguages: ["en"],
            prioritizedTrackers: [], preferTrackerOverQuality: false
        )
        let encoded = try JSONEncoder().encode(body)
        let object = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])

        #expect(object["cutoffFormat"] is NSNull)
        #expect(object["maxSizeMb"] is NSNull)
        #expect(object["minAudioBitrate"] is NSNull)
        #expect(object["allowedFormats"] as? [String] == ["epub"])
    }

    @Test func notificationChannelValuesRoundTrip() throws {
        let values: [String: JSONValue] = [
            "url": .string("https://example.test/hook"),
            "attempts": .number(3),
            "enabled": .bool(true),
            "secret": .null,
        ]
        let decoded = try JSONDecoder().decode([String: JSONValue].self, from: JSONEncoder().encode(values))
        #expect(decoded["url"]?.stringValue == "https://example.test/hook")
        #expect(decoded["attempts"]?.stringValue == "3")
        #expect(decoded["enabled"]?.stringValue == "true")
        #expect(decoded["secret"]?.stringValue == "")
    }
}
