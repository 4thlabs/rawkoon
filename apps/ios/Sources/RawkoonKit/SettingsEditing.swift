import Foundation

/// Edits to an ordered list of names (a profile's prioritized trackers), where position is the priority.
public enum OrderedListEdit {
    /// `items` with the entry at `index` shifted by `offset`; unchanged when that falls outside the list.
    public static func moved(_ items: [String], index: Int, by offset: Int) -> [String] {
        let target = index + offset
        guard items.indices.contains(index), items.indices.contains(target) else { return items }
        var result = items
        result.swapAt(index, target)
        return result
    }

    /// `items` with `raw` added at the end; blank or already-present (ignoring case) entries are dropped.
    public static func appended(_ items: [String], _ raw: String) -> [String] {
        let name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, !items.contains(where: { $0.caseInsensitiveCompare(name) == .orderedSame }) else {
            return items
        }
        return items + [name]
    }

    /// `items` with every comma or newline separated entry of `raw` appended in order, each trimmed
    /// and skipped when blank or already present.
    public static func appendedAll(_ items: [String], _ raw: String) -> [String] {
        raw.split(whereSeparator: { $0 == "," || $0.isNewline }).reduce(items) { appended($0, String($1)) }
    }

    public static func removed(_ items: [String], at index: Int) -> [String] {
        guard items.indices.contains(index) else { return items }
        var result = items
        result.remove(at: index)
        return result
    }
}

public enum ParsedSeedDays: Equatable, Sendable {
    /// Empty field: no time target.
    case none
    case minutes(Int)
    case invalid
}

/// The "or Y days" half of a sharing target, typed in days and stored in minutes.
public enum SeedTimeDays {
    public static func parse(_ raw: String) -> ParsedSeedDays {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return .none
        }
        guard let days = Double(trimmed.replacingOccurrences(of: ",", with: ".")), days.isFinite, days >= 0 else {
            return .invalid
        }
        // A zero target means "none", never "met immediately".
        let minutes = Int((days * 1440).rounded())
        return minutes > 0 ? .minutes(minutes) : .none
    }

    /// Prefill text for a stored target; empty when there is none. Whole days read as an integer,
    /// anything else as a decimal with enough places that parsing it gives the same minutes back.
    public static func text(forMinutes minutes: Int?) -> String {
        guard let minutes, minutes > 0 else { return "" }
        if minutes % 1440 == 0 {
            return String(minutes / 1440)
        }
        var text = String(format: "%.5f", Double(minutes) / 1440)
        while text.hasSuffix("0") {
            text.removeLast()
        }
        return text
    }

    /// The target to save for a field: the stored minutes untouched while the text still reads as it
    /// was prefilled, otherwise whatever the edited text parses to.
    public static func resolve(text: String, loadedText: String, loadedMinutes: Int?) -> ParsedSeedDays {
        guard text == loadedText else { return parse(text) }
        return loadedMinutes.flatMap { $0 > 0 ? ParsedSeedDays.minutes($0) : nil } ?? .none
    }
}

/// File extensions a download may not contain, entered as one comma or space separated line.
public enum BlockedExtensions {
    /// Lowercased, without dots, deduplicated in order; entries the server would reject are dropped.
    public static func parse(_ raw: String) -> [String] {
        var seen = Set<String>()
        return raw.split(whereSeparator: { $0 == "," || $0.isWhitespace }).compactMap { piece in
            let ext = piece.lowercased().drop { $0 == "." }
            guard (1 ... 10).contains(ext.count), ext.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber) }),
                  seen.insert(String(ext)).inserted
            else { return nil }
            return String(ext)
        }
    }

    public static func text(_ extensions: [String]) -> String {
        extensions.joined(separator: ", ")
    }
}

/// How many things System › Health asks the admin to look at, for the badge on the System row.
public enum SystemHealth {
    /// A library health run counts its issues; one that failed outright counts as a problem even with none.
    public static func libraryProblems(issueCount: Int, status: String?) -> Int {
        let failed = status?.lowercased() == "failed"
        return max(max(0, issueCount), failed ? 1 : 0)
    }

    public static func problemCount(
        readinessProblems: Int, attentionItems: Int, libraryIssues: Int, rssFailed: Bool
    ) -> Int {
        max(0, readinessProblems) + max(0, attentionItems) + max(0, libraryIssues) + (rssFailed ? 1 : 0)
    }

    /// The RSS status values that mean the last run did not finish well.
    public static func rssFailed(status: String?) -> Bool {
        guard let status = status?.lowercased() else { return false }
        return status == "failed" || status == "error"
    }
}
