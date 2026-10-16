import Foundation
@testable import Rawkoon
import Testing

@MainActor
struct SettingsRegroupTests {
    private static func json(_ value: some Encodable) throws -> [String: Any] {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return try #require(JSONSerialization.jsonObject(with: encoder.encode(value)) as? [String: Any])
    }

    @Test func everyServerScreenSitsUnderExactlyOnePage() {
        for destination in SettingsDestination.allCases where destination.isAdminOnly {
            #expect(destination.group?.destinations.contains(destination) == true)
        }
        let paged = SettingsGroup.allCases.flatMap(\.destinations)
        let admin = SettingsDestination.allCases.filter(\.isAdminOnly)
        #expect(Set(paged) == Set(admin))
        #expect(paged.count == admin.count)
    }

    @Test func systemHoldsTheMonitoringScreens() {
        let system = SettingsGroup.system.destinations
        #expect(system.contains(.health))
        #expect(system.contains(.jobs))
        #expect(system.contains(.reencode))
        #expect(system.contains(.blocklist))
        #expect(system.contains(.aiUsage))
        #expect(system.contains(.releases))
        #expect(system.contains(.liveUpdates))
        #expect(!SettingsGroup.server.contains(.system))
    }

    @Test func searchStillFindsTheRegroupedScreens() {
        #expect(SettingsDestination.indexers.matches("jackett"))
        #expect(SettingsDestination.indexers.matches("rss"))
        #expect(SettingsDestination.libraryDefaults.matches("default book"))
        #expect(SettingsDestination.autoGrab.matches("cron"))
        #expect(SettingsDestination.seeding.matches("extensions"))
        #expect(SettingsDestination.aiUsage.matches("spend"))
        #expect(SettingsDestination.security.matches("calendar"))
        #expect(SettingsDestination.appPreferences.matches("language"))
        #expect(SettingsDestination.health.matches("readiness"))
    }

    @Test func defaultProfilesSendExplicitNullsSoNoneSticks() throws {
        let object = try Self.json(UpdateDefaultProfilesBody(
            defaultMovieQualityProfileId: 3, defaultShowQualityProfileId: nil, defaultBookQualityProfileId: nil
        ))
        #expect(object["default_movie_quality_profile_id"] as? Int == 3)
        #expect(object.keys.contains("default_show_quality_profile_id"))
        #expect(object["default_show_quality_profile_id"] is NSNull)
        #expect(object["default_book_quality_profile_id"] is NSNull)
    }

    @Test func folderSettingsLeaveTheManagerAndDefaultsToTheirScreens() throws {
        let object = try Self.json(UpdateMediaSettingsBody(
            postProcessingEnabled: true, moviesLibraryPath: nil, showsLibraryPath: nil, downloadsPath: nil,
            fileOperation: "hardlink", movieTemplate: "", episodeTemplate: "", activeIndexerManager: nil,
            defaultMovieQualityProfileId: nil, defaultShowQualityProfileId: nil, minFreeSpaceGb: nil
        ))
        #expect(object["active_indexer_manager"] == nil)
        #expect(object["default_movie_quality_profile_id"] == nil)
        #expect(object["default_show_quality_profile_id"] == nil)
    }

    @Test func seedSettingsCarryTimeTargetsAndSafetyFields() throws {
        let object = try Self.json(UpdateSeedSettingsBody(
            seedSweepEnabled: true, minSeedRatio: 2, publicSeedTimeMins: 4320, privateSeedRatio: nil,
            privateSeedTimeMins: nil, blockedExtensions: ["exe"], minFreeSpaceGb: 20
        ))
        #expect(object["public_seed_time_mins"] as? Int == 4320)
        #expect(object["private_seed_time_mins"] is NSNull)
        #expect(object["private_seed_ratio"] is NSNull)
        #expect(object["blocked_extensions"] as? [String] == ["exe"])
        #expect(object["min_free_space_gb"] as? Int == 20)
    }

    @Test func healthDecodesTheLatestRun() throws {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let body = #"""
        {"latest":{"status":"success","trigger":"cron","started_at":"2026-01-01T00:00:00Z",
        "completed_at":"2026-01-01T00:01:00Z","summary":{"total_issues":2},
        "issues":[{"kind":"missing_file_path","media_id":5,"title":"A","detail":"gone"}],
        "warnings":[],"error":null}}
        """#
        let response = try decoder.decode(LibraryHealthResponse.self, from: Data(body.utf8))
        #expect(response.latest?.issueCount == 2)
        #expect(response.latest?.issues?.first?.mediaId == 5)
        let empty = try decoder.decode(LibraryHealthResponse.self, from: Data(#"{"latest":null}"#.utf8))
        #expect(empty.latest == nil)
    }
}
