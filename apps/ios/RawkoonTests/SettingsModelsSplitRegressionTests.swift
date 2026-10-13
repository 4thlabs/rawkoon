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

    private static let snakeDecoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    @Test func qualityProfileDecodesGrabDelayFields() throws {
        let json = #"{"id":1,"name":"HD","grab_delay_minutes":90,"bypass_delay_if_cutoff_met":false}"#
        let profile = try Self.snakeDecoder.decode(QualityProfile.self, from: Data(json.utf8))
        #expect(profile.grabDelayMinutes == 90)
        #expect(profile.bypassDelayIfCutoffMet == false)
    }

    @Test func qualityProfileFromOlderServerStillDecodes() throws {
        let json = #"{"id":1,"name":"HD"}"#
        let profile = try Self.snakeDecoder.decode(QualityProfile.self, from: Data(json.utf8))
        #expect(profile.grabDelayMinutes == nil)
        #expect(profile.bypassDelayIfCutoffMet == nil)
    }

    @Test func saveQualityProfileBodyEncodesGrabDelayFields() throws {
        let body = SaveQualityProfileBody(
            name: "HD", minResolution: 1080, cutoffResolution: nil, preferredSources: [],
            preferredCodecs: [], preferredLanguages: [], preferredSearchLanguage: nil,
            prioritizedTrackers: [], preferTrackerOverQuality: false, maxSizeGb: nil,
            requireHdr: false, preferHdr: false, minSeeders: 0,
            grabDelayMinutes: 120, bypassDelayIfCutoffMet: true, customFormats: []
        )
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let object = try #require(JSONSerialization.jsonObject(with: encoder.encode(body)) as? [String: Any])
        #expect(object["grab_delay_minutes"] as? Int == 120)
        #expect(object["bypass_delay_if_cutoff_met"] as? Bool == true)
    }

    @Test func mediaSettingsDecodeMinFreeSpaceWithAndWithoutField() throws {
        let with = try Self.snakeDecoder.decode(
            PostProcessingSettingsDTO.self, from: Data(#"{"min_free_space_gb":25}"#.utf8)
        )
        let without = try Self.snakeDecoder.decode(PostProcessingSettingsDTO.self, from: Data("{}".utf8))
        #expect(with.minFreeSpaceGb == 25)
        #expect(without.minFreeSpaceGb == nil)
    }

    @Test func mediaSettingsUpdateSendsMinFreeSpaceOnlyWhenSet() throws {
        func object(_ minFree: Int?) throws -> [String: Any] {
            let body = UpdateMediaSettingsBody(
                postProcessingEnabled: true, moviesLibraryPath: nil, showsLibraryPath: nil,
                downloadsPath: nil, fileOperation: "hardlink", movieTemplate: "", episodeTemplate: "",
                minSeedRatio: 0, activeIndexerManager: nil, defaultMovieQualityProfileId: nil,
                defaultShowQualityProfileId: nil, minFreeSpaceGb: minFree
            )
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            return try #require(JSONSerialization.jsonObject(with: encoder.encode(body)) as? [String: Any])
        }
        #expect(try object(0)["min_free_space_gb"] as? Int == 0)
        #expect(try object(nil)["min_free_space_gb"] == nil)
        #expect(try object(nil)["seed_sweep_enabled"] == nil)
    }
}
