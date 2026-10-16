import Foundation

public enum CronLocale: String, Sendable {
    case en, fr
}

/// Validation and plain-words description of the release-check cron, ported
/// from the shared web/API `cron.ts` so the phone agrees with the server.
public enum ReleaseCheckCron {
    public static let defaultCron = "0 */6 * * *"
    /// Same floor as the server: more frequent checks only hammer the indexers.
    public static let minIntervalMinutes = 15

    public enum Validation: Equatable, Sendable {
        case ok(String)
        case invalid
        case tooFrequent
    }

    public enum Preset: String, CaseIterable, Sendable {
        case hourly, every6h, every12h, daily

        public var cron: String {
            switch self {
            case .hourly: "0 * * * *"
            case .every6h: ReleaseCheckCron.defaultCron
            case .every12h: "0 */12 * * *"
            case .daily: "0 0 * * *"
            }
        }
    }

    /// The preset a stored cron came from, or nil when it is custom.
    public static func preset(for cron: String) -> Preset? {
        let normalized = squash(cron)
        return Preset.allCases.first { $0.cron == normalized }
    }

    public static func normalize(_ expr: String) -> String? {
        let normalized = squash(expr)
        return isValid(normalized) ? normalized : nil
    }

    public static func validate(_ expr: String) -> Validation {
        guard let cron = normalize(expr), let interval = minInterval(cron) else { return .invalid }
        return interval < minIntervalMinutes ? .tooFrequent : .ok(cron)
    }

    // MARK: Parsing

    private struct Field {
        let min: Int
        let max: Int
        var names: [String] = []
        var nameOffset = 0
    }

    private static let months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    private static let weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
    private static let fields: [Field] = [
        Field(min: 0, max: 59),
        Field(min: 0, max: 23),
        Field(min: 1, max: 31),
        Field(min: 1, max: 12, names: months, nameOffset: 1),
        Field(min: 0, max: 7, names: weekdays, nameOffset: 0),
    ]
    // Longest each month can be (February counts leap years).
    private static let monthDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    private static func squash(_ expr: String) -> String {
        expr.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }

    private static func isDigits(_ s: String) -> Bool {
        !s.isEmpty && s.allSatisfy { $0 >= "0" && $0 <= "9" }
    }

    private static func parseValue(_ raw: String, _ spec: Field) -> Int? {
        if isDigits(raw) {
            guard let n = Int(raw), n >= spec.min, n <= spec.max else { return nil }
            return n
        }
        if let idx = spec.names.firstIndex(of: raw.uppercased()) {
            return idx + spec.nameOffset
        }
        return nil
    }

    private static func expand(_ field: String, _ spec: Field) -> [Int]? {
        var values = Set<Int>()
        for part in field.split(separator: ",", omittingEmptySubsequences: false) {
            if part.isEmpty { return nil }
            let slash = part.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
            guard slash.count <= 2 else { return nil }
            let range = slash[0]
            let step: String? = slash.count == 2 ? slash[1] : nil
            let lo: Int
            let hi: Int
            if range == "*" {
                lo = spec.min
                hi = spec.max
            } else if range.contains("-") {
                let ends = range.split(separator: "-", omittingEmptySubsequences: false).map(String.init)
                guard ends.count == 2, let from = parseValue(ends[0], spec),
                      let to = parseValue(ends[1], spec), from <= to else { return nil }
                lo = from
                hi = to
            } else {
                guard let v = parseValue(range, spec) else { return nil }
                lo = v
                hi = step == nil ? v : spec.max
            }
            var stepN = 1
            if let step {
                guard isDigits(step), let n = Int(step), n >= 1 else { return nil }
                stepN = n
            }
            for v in stride(from: lo, through: hi, by: stepN) {
                values.insert(v)
            }
        }
        return values.sorted()
    }

    private static func split(_ expr: String) -> [String]? {
        let parts = expr.split(whereSeparator: { $0.isWhitespace }).map(String.init)
        return parts.count == 5 ? parts : nil
    }

    /// False when day-of-month and month can never name a real date (31 Feb).
    private static func hasReachableDate(_ parts: [String]) -> Bool {
        // With a weekday restriction cron fires on either match, so the date alone can't rule it out.
        if parts[4] != "*" { return true }
        guard let days = expand(parts[2], fields[2]), let mons = expand(parts[3], fields[3]) else { return false }
        return mons.contains { m in days.contains { $0 <= monthDays[m - 1] } }
    }

    public static func isValid(_ expr: String) -> Bool {
        guard let parts = split(expr) else { return false }
        for (i, p) in parts.enumerated() {
            guard let values = expand(p, fields[i]), !values.isEmpty else { return false }
        }
        return hasReachableDate(parts)
    }

    /// Smallest gap in minutes between two runs, or nil for an invalid cron.
    public static func minInterval(_ expr: String) -> Int? {
        guard let parts = split(expr), isValid(expr),
              let minutes = expand(parts[0], fields[0]), let hours = expand(parts[1], fields[1]) else { return nil }
        let times = hours.flatMap { h in minutes.map { h * 60 + $0 } }.sorted()
        guard let first = times.first, let last = times.last else { return nil }
        var gap = 1440 - last + first
        for i in 1 ..< max(times.count, 1) {
            gap = min(gap, times[i] - times[i - 1])
        }
        return gap
    }

    // MARK: Description

    private static let enWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    private static let frWeekdays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

    private static func pad2(_ n: Int) -> String {
        n < 10 ? "0\(n)" : "\(n)"
    }

    private static func time(_ hour: Int, _ minute: Int, _ locale: CronLocale) -> String {
        if locale == .fr { return "\(hour) h \(pad2(minute))" }
        let h12 = hour % 12 == 0 ? 12 : hour % 12
        return "\(h12):\(pad2(minute)) \(hour < 12 ? "AM" : "PM")"
    }

    private static func join(_ items: [String], _ locale: CronLocale) -> String {
        guard items.count > 1 else { return items.joined() }
        let and = locale == .fr ? "et" : "and"
        return items.dropLast().joined(separator: ", ") + " \(and) " + items[items.count - 1]
    }

    private static func ordinal(_ n: Int, _ locale: CronLocale) -> String {
        if locale == .fr { return n == 1 ? "1er" : "\(n)" }
        if (11 ... 13).contains(n % 100) { return "\(n)th" }
        switch n % 10 {
        case 1: return "\(n)st"
        case 2: return "\(n)nd"
        case 3: return "\(n)rd"
        default: return "\(n)th"
        }
    }

    /// A `*` or `*/n` / `0/n` over a whole range: the step, else nil.
    private static func wholeRangeStep(_ field: String) -> Int? {
        if field == "*" { return 1 }
        let parts = field.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 2, parts[0] == "*" || parts[0] == "0", isDigits(parts[1]) else { return nil }
        return Int(parts[1])
    }

    private static func minuteStep(_ field: String, _ locale: CronLocale) -> String? {
        let parts = field.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 2, isDigits(parts[1]), let step = Int(parts[1]), step >= 2, 60 % step == 0 else { return nil }
        let head = parts[0].split(separator: "-", omittingEmptySubsequences: false).map(String.init)
        var start = 0
        if parts[0] != "*" {
            guard head.count <= 2, isDigits(head[0]), let s = Int(head[0]) else { return nil }
            start = s
            if head.count == 2 {
                guard isDigits(head[1]), Int(head[1]) == 59 else { return nil }
            }
        }
        guard start <= 59 else { return nil }
        let base = locale == .fr ? "toutes les \(step) minutes" : "every \(step) minutes"
        if start == 0 { return base }
        return locale == .fr ? "\(base), à partir de la minute \(start)" : "\(base), starting at minute \(start)"
    }

    private static func describeWeekdays(_ days: [Int], _ locale: CronLocale) -> String {
        let set = Array(Set(days.map { $0 % 7 })).sorted()
        let names = locale == .fr ? frWeekdays : enWeekdays
        if set == [1, 2, 3, 4, 5] { return locale == .fr ? "chaque jour de semaine" : "every weekday" }
        // Monday-first reads naturally; Sunday sorts last.
        let ordered = set.contains(0) ? set.filter { $0 != 0 } + [0] : set
        let contiguous = ordered.count >= 3 && ordered.indices.allSatisfy { i in
            i == 0 || ordered[i] == ordered[i - 1] + 1 || (ordered[i] == 0 && ordered[i - 1] == 6)
        }
        if contiguous {
            let first = names[ordered[0]]
            let last = names[ordered[ordered.count - 1]]
            return locale == .fr ? "du \(first) au \(last)" : "every \(first) to \(last)"
        }
        let list = join(ordered.map { names[$0] }, locale)
        return locale == .fr ? "chaque \(list)" : "every \(list)"
    }

    private static func describeFiveField(_ parts: [String], _ locale: CronLocale) -> String? {
        let minF = parts[0], hourF = parts[1], domF = parts[2], monF = parts[3], dowF = parts[4]
        let fr = locale == .fr
        if monF != "*" { return nil }

        if domF == "*", dowF == "*" {
            if hourF == "*" {
                if minF == "*" { return fr ? "chaque minute" : "every minute" }
                if let text = minuteStep(minF, locale) { return text }
                if isDigits(minF), let minute = Int(minF) {
                    if minute == 0 { return fr ? "chaque heure" : "every hour" }
                    return fr ? "chaque heure, à la minute \(minute)" : "every hour, at minute \(minute)"
                }
                return nil
            }
            if let step = wholeRangeStep(hourF), step > 1, isDigits(minF), let minute = Int(minF) {
                if 24 % step != 0 { return nil }
                let base = fr ? "toutes les \(step) heures" : "every \(step) hours"
                if minute == 0 { return base }
                return fr ? "\(base), à la minute \(minute)" : "\(base), at minute \(minute)"
            }
        }

        // Everything below is anchored to specific times of day.
        guard isDigits(minF), let minute = Int(minF), hourF != "*", !hourF.contains("/"),
              let hours = expand(hourF, fields[1]), !hours.isEmpty, hours.count <= 4 else { return nil }
        let times = join(hours.map { time($0, minute, locale) }, locale)

        if domF == "*", dowF == "*" { return fr ? "chaque jour à \(times)" : "every day at \(times)" }
        if domF == "*" {
            guard let days = expand(dowF, fields[4]) else { return nil }
            return "\(describeWeekdays(days, locale)) \(fr ? "à" : "at") \(times)"
        }
        if dowF == "*" {
            guard let days = expand(domF, fields[2]), days.count <= 4,
                  !domF.contains("/"), !domF.contains("-") else { return nil }
            let list = join(days.map { ordinal($0, locale) }, locale)
            return fr ? "le \(list) de chaque mois à \(times)" : "on the \(list) of each month at \(times)"
        }
        return nil
    }

    /// Plain words for a cron ("every 6 hours", "every day at 3:00 AM"), lowercase
    /// so it sits mid-sentence. Falls back to the raw expression for unusual shapes.
    public static func describe(_ expr: String, locale: CronLocale) -> String {
        let trimmed = squash(expr)
        guard isValid(trimmed), let parts = split(trimmed) else { return trimmed }
        return describeFiveField(parts, locale) ?? trimmed
    }
}
