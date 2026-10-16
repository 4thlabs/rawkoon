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

    /// Prefill text for a stored target; empty when there is none.
    public static func text(forMinutes minutes: Int?) -> String {
        guard let minutes, minutes > 0 else { return "" }
        let days = Double(minutes) / 1440
        return days == days.rounded() ? String(Int(days)) : String(format: "%.1f", days)
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
