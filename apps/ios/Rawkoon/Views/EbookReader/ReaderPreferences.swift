@preconcurrency import ReadiumNavigator
@preconcurrency import ReadiumShared
import SwiftUI

/// Global (not per-book) typography, persisted in UserDefaults and submitted
/// to the navigator as `EPUBPreferences`. `lineHeight` only takes effect when
/// publisher styles are off, so that flag is always included in the mapping.
struct ReaderPreferences: Codable, Equatable {
    var fontSize: Double
    var lineHeight: Double
    var pageMargins: Double
    var theme: ReaderTheme

    static let `default` = ReaderPreferences(
        fontSize: 1.0,
        lineHeight: 1.5,
        pageMargins: 1.0,
        theme: .dark
    )

    private static let defaultsKey = "rawkoon.reader.epub.preferences"

    static func load() -> ReaderPreferences {
        guard
            let data = UserDefaults.standard.data(forKey: defaultsKey),
            let decoded = try? JSONDecoder().decode(ReaderPreferences.self, from: data)
        else {
            return .default
        }
        return decoded
    }

    func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        UserDefaults.standard.set(data, forKey: Self.defaultsKey)
    }

    func asEPUBPreferences(language: String?) -> EPUBPreferences {
        EPUBPreferences(
            fontSize: fontSize,
            language: language.map { Language(code: .bcp47($0)) },
            lineHeight: lineHeight,
            pageMargins: pageMargins,
            publisherStyles: false,
            scroll: false,
            theme: theme.readiumTheme
        )
    }
}

enum ReaderTheme: String, Codable, CaseIterable, Identifiable {
    case light
    case sepia
    case dark

    var id: String {
        rawValue
    }

    var title: LocalizedStringKey {
        switch self {
        case .light: "Light"
        case .sepia: "Sepia"
        case .dark: "Dark"
        }
    }

    var readiumTheme: ReadiumNavigator.Theme {
        switch self {
        case .light: .light
        case .sepia: .sepia
        case .dark: .dark
        }
    }
}
