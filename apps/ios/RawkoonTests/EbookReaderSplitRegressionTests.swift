import Foundation
@testable import Rawkoon
import Testing

@MainActor
struct EbookReaderSplitRegressionTests {
    @Test func readerStatePhaseIgnoresPayload() {
        #expect(ReaderState.opening.phase == .opening)
        #expect(ReaderState.failed("x").phase == .failed)
        #expect(ReaderState.failed("x").phase == ReaderState.failed("y").phase)
    }

    @Test func defaultPreferencesAreStable() {
        let defaults = ReaderPreferences.default
        #expect(defaults.fontSize == 1.0)
        #expect(defaults.lineHeight == 1.5)
        #expect(defaults.pageMargins == 1.0)
        #expect(defaults.theme == .dark)
    }

    @Test func preferencesRoundTripThroughCodable() throws {
        var prefs = ReaderPreferences.default
        prefs.fontSize = 1.4
        prefs.theme = .sepia
        let data = try JSONEncoder().encode(prefs)
        #expect(try JSONDecoder().decode(ReaderPreferences.self, from: data) == prefs)
    }

    @Test func epubPreferencesDisablePublisherStylesAndCarryLanguage() {
        var prefs = ReaderPreferences.default
        prefs.fontSize = 1.2
        prefs.theme = .light
        let mapped = prefs.asEPUBPreferences(language: "fr")
        #expect(mapped.publisherStyles == false)
        #expect(mapped.scroll == false)
        #expect(mapped.fontSize == 1.2)
        #expect(mapped.language != nil)
        #expect(prefs.asEPUBPreferences(language: nil).language == nil)
    }

    @Test func themeIdentifiersAreStable() {
        #expect(ReaderTheme.allCases.map(\.id) == ["light", "sepia", "dark"])
    }
}
