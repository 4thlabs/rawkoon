import RawkoonKit
import SwiftUI

/// Words and symbols for a wanted item's last search outcome; the Kit decides what to show.
enum LastSearchCopy {
    /// "No match · 2 hr. ago"; the age is left off when unknown.
    static func headline(_ note: LastSearchNote, now: Date = Date()) -> String {
        let title = switch note.outcome {
        case .noMatch: String(localized: "No match")
        case .delayed: String(localized: "Held by the grab delay")
        case .notReleased: String(localized: "Not released yet")
        case .grabbed: String(localized: "Searched, grabbed a release")
        case .error: String(localized: "Search failed")
        }
        guard note.showsAge, let at = note.at else { return title }
        return "\(title) · \(age(at, now: now))"
    }

    static func age(_ date: Date, now: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        formatter.dateTimeStyle = .numeric
        return formatter.localizedString(for: date, relativeTo: now)
    }

    static func symbol(_ outcome: LiveSearchOutcome) -> String {
        switch outcome {
        case .noMatch: "magnifyingglass"
        case .delayed: "clock"
        case .notReleased: "calendar"
        case .grabbed: "checkmark"
        case .error: "exclamationmark.triangle"
        }
    }

    static func tint(_ note: LastSearchNote) -> Color {
        note.isMiss ? Theme.terracotta : Theme.muted
    }
}

/// One line saying how the last search ended, with the reason beneath when asked for.
struct LastSearchLine: View {
    let note: LastSearchNote
    var showsReason = false

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Label {
                Text(verbatim: LastSearchCopy.headline(note))
            } icon: {
                Image(systemName: LastSearchCopy.symbol(note.outcome))
            }
            .font(.caption.weight(.medium))
            .foregroundStyle(LastSearchCopy.tint(note))
            if showsReason, let reason = note.reason {
                Text(verbatim: reason)
                    .font(.caption2)
                    .foregroundStyle(Theme.muted)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
