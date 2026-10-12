import Foundation

// Library growth card DTOs (`GET /api/library/growth`). Decoded with the snake_case media decoder.

nonisolated struct GrowthPeriod: Decodable, Sendable, Equatable {
    /// "YYYY-MM-DD" in the instance timezone.
    let start: String
    let movies: Int
    let episodes: Int
    let books: Int
    let upgrades: Int
    /// Null for non-admin users.
    let bytes: Int?

    var titles: Int {
        movies + episodes + books
    }

    /// The card's headline metric: bytes for admins, titles otherwise.
    func metric(admin: Bool) -> Int {
        admin ? (bytes ?? 0) : titles
    }
}

nonisolated struct LibraryGrowth: Decodable, Sendable, Equatable {
    let timezone: String
    let month: GrowthPeriod
    let previousToDate: GrowthPeriod
    let previousMonth: GrowthPeriod
    let weeks: [GrowthPeriod]
    let since: String?

    /// The card hides itself when nothing has landed in the month or any of the weeks.
    var isEmpty: Bool {
        month.titles == 0 && month.upgrades == 0 && weeks.allSatisfy { $0.titles == 0 && $0.upgrades == 0 }
    }
}

nonisolated struct LibraryGrowthResponse: Decodable, Sendable {
    let growth: LibraryGrowth
}

nonisolated enum GrowthDates {
    private static var calendar: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC") ?? .gmt
        return c
    }

    /// Parses a "YYYY-MM-DD" day string as a UTC midnight.
    static func parse(_ day: String) -> Date? {
        let parts = day.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    static func monthName(_ day: String, locale: Locale = .current) -> String {
        format(day, "LLLL", locale: locale)
    }

    static func shortDay(_ day: String, locale: Locale = .current) -> String {
        format(day, "MMMd", locale: locale)
    }

    static func mediumDay(_ day: String, locale: Locale = .current) -> String {
        format(day, "yMMMd", locale: locale)
    }

    private static func format(_ day: String, _ template: String, locale: Locale) -> String {
        guard let date = parse(day) else { return day }
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = TimeZone(identifier: "UTC")
        f.setLocalizedDateFormatFromTemplate(template)
        return f.string(from: date)
    }

    /// True when the week starting `start` ended before `since` (or nothing has been recorded).
    static func isBeforeSince(weekStart start: String, since: String?) -> Bool {
        guard let since, let sinceDate = parse(since), let s = parse(start),
              let end = calendar.date(byAdding: .day, value: 6, to: s) else { return true }
        return end < sinceDate
    }
}
