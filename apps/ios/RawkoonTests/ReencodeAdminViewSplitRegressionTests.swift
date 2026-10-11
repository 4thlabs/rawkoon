@testable import Rawkoon
import Testing

@MainActor
struct ReencodeAdminViewSplitRegressionTests {
    @Test func settingsSummaryJoinsCodecEncoderResolutionAndPreset() {
        var settings = TranscodeJobSettings()
        settings.codec = .hevc
        settings.encoder = .software
        settings.resolution = .keep
        settings.mode = .quality
        settings.preset = .balanced
        let view = ReencodeAdminView()
        #expect(view.settingsSummary(settings) == "HEVC · CPU · \(TranscodePreset.balanced.rawValue)")

        settings.encoder = .vaapi
        settings.resolution = .p1080
        settings.mode = .target
        settings.targetVideoKbps = 2500
        settings.convertLosslessAudio = true
        #expect(view.settingsSummary(settings) == "HEVC · GPU · →1080p · 2.5 Mbps · EAC3")
    }
}
