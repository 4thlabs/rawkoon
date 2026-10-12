import RawkoonKit
import SwiftUI

/// Home card: what landed in the library this calendar month, against the same
/// point last month, with twelve weekly bars. Pure view: HomeView loads the data.
struct LibraryGrowthCard: View {
    let growth: LibraryGrowth
    let isAdmin: Bool
    let showBooks: Bool

    @State private var selected: Int?

    init(growth: LibraryGrowth, isAdmin: Bool, showBooks: Bool, selected: Int? = nil) {
        self.growth = growth
        self.isAdmin = isAdmin
        self.showBooks = showBooks
        _selected = State(initialValue: selected)
    }

    private static let barAreaHeight: CGFloat = 64

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Label("Library growth", systemImage: "chart.bar")
                    .font(.display(16)).foregroundStyle(Theme.textStrong)
                Text("\(GrowthDates.monthName(growth.month.start)) so far")
                    .font(.caption).foregroundStyle(Theme.faint)
            }
            headline
            figures
            bars
            footer
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.border, lineWidth: 1))
    }

    // MARK: Headline

    private var headline: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                if isAdmin {
                    Text(Self.bytes(growth.month.bytes ?? 0))
                        .font(.system(.title, design: .rounded).weight(.semibold))
                        .foregroundStyle(Theme.textStrong)
                        .rawkoonNumeric(Double(growth.month.bytes ?? 0))
                } else {
                    Text(String(growth.month.titles))
                        .font(.system(.title, design: .rounded).weight(.semibold))
                        .foregroundStyle(Theme.textStrong)
                        .rawkoonNumeric(Double(growth.month.titles))
                    Text("titles").font(.subheadline).foregroundStyle(Theme.muted)
                }
            }
            if let comparison {
                Text(comparison).font(.caption).foregroundStyle(Theme.muted)
            }
        }
        .accessibilityElement(children: .combine)
    }

    /// Nil when last month's same point is zero: a percentage of nothing is noise.
    private var comparison: String? {
        let previous = growth.previousToDate.metric(admin: isAdmin)
        guard previous > 0 else { return nil }
        let current = growth.month.metric(admin: isAdmin)
        let pct = Int((Double(current - previous) / Double(previous) * 100).rounded())
        let arrow = pct > 0 ? "▲ " : pct < 0 ? "▼ " : ""
        let month = GrowthDates.monthName(growth.previousToDate.start)
        return "\(arrow)\(abs(pct))% " + String(localized: "vs the same point in \(month)")
    }

    // MARK: Figures

    private var figures: some View {
        HStack(alignment: .top, spacing: 22) {
            figure(growth.month.movies, "Movies")
            figure(growth.month.episodes, "Episodes")
            if showBooks {
                figure(growth.month.books, "Books")
            }
            Spacer(minLength: 0)
        }
    }

    private func figure(_ value: Int, _ label: LocalizedStringKey) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(String(value))
                .font(.system(.title3, design: .rounded).weight(.semibold)).foregroundStyle(Theme.textStrong)
                .rawkoonNumeric(Double(value))
            Text(label).font(.caption2).foregroundStyle(Theme.faint)
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: Bars

    private var weeks: [GrowthPeriod] {
        growth.weeks
    }

    private var peak: Int {
        max(weeks.map { $0.metric(admin: isAdmin) }.max() ?? 0, 1)
    }

    private var bars: some View {
        VStack(alignment: .leading, spacing: 6) {
            GeometryReader { geo in
                HStack(alignment: .bottom, spacing: 5) {
                    ForEach(Array(weeks.enumerated()), id: \.offset) { index, week in
                        bar(week, index: index)
                    }
                }
                .contentShape(Rectangle())
                // One gesture over the whole strip: full-size touch target, and dragging scrubs weeks.
                .gesture(
                    DragGesture(minimumDistance: 0).onChanged { value in
                        select(index(atX: value.location.x, width: geo.size.width))
                    }
                )
            }
            .frame(height: Self.barAreaHeight)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(trendSummary)
            .accessibilityValue(selected == nil ? "" : caption)
            .accessibilityAdjustableAction { direction in
                guard !weeks.isEmpty else { return }
                let last = weeks.count - 1
                switch direction {
                case .increment: select(min((selected ?? -1) + 1, last))
                case .decrement: select(max((selected ?? weeks.count) - 1, 0))
                @unknown default: break
                }
            }

            // Same text as the strip's accessibility value, so VoiceOver skips it.
            Text(caption)
                .font(.caption2).foregroundStyle(Theme.muted)
                .lineLimit(2)
                .frame(minHeight: 28, alignment: .topLeading)
                .accessibilityHidden(true)
        }
    }

    private func index(atX x: CGFloat, width: CGFloat) -> Int {
        guard width > 0, !weeks.isEmpty else { return 0 }
        let raw = Int(x / width * CGFloat(weeks.count))
        return min(max(raw, 0), weeks.count - 1)
    }

    private func select(_ index: Int) {
        guard selected != index else { return }
        withRawkoonMotion(RawkoonMotion.snappy) { selected = index }
    }

    private func bar(_ week: GrowthPeriod, index: Int) -> some View {
        let noData = GrowthDates.isBeforeSince(weekStart: week.start, since: growth.since)
        let isCurrent = index == weeks.count - 1
        let isSelected = selected == index
        let fraction = CGFloat(week.metric(admin: isAdmin)) / CGFloat(peak)
        let height = max(Self.barAreaHeight * fraction, 3)
        return ZStack(alignment: .bottom) {
            Color.clear
            if noData {
                Rectangle().fill(Theme.border).frame(height: 1)
            } else if isCurrent {
                // Outlined and tinted: the week is still in progress.
                RoundedRectangle(cornerRadius: 3)
                    .fill(Theme.apricot.opacity(0.25))
                    .overlay(RoundedRectangle(cornerRadius: 3)
                        .strokeBorder(Theme.apricot, style: StrokeStyle(lineWidth: 1.2, dash: [3, 2])))
                    .frame(height: height)
            } else {
                RoundedRectangle(cornerRadius: 3)
                    .fill(isSelected ? Theme.apricotSoft : Theme.apricot.opacity(week.metric(admin: isAdmin) == 0 ? 0.3 : 0.85))
                    .frame(height: height)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var caption: String {
        guard let selected, weeks.indices.contains(selected) else {
            return String(localized: "Tap a bar for that week.")
        }
        let week = weeks[selected]
        let day = GrowthDates.shortDay(week.start)
        if GrowthDates.isBeforeSince(weekStart: week.start, since: growth.since) {
            return String(localized: "Week of \(day)") + " · " + String(localized: "No data")
        }
        return String(localized: "Week of \(day)") + " · " + detail(week)
    }

    /// "42 GB · 3 movies · 12 episodes" for admins, without the bytes for members.
    private func detail(_ week: GrowthPeriod) -> String {
        var parts: [String] = []
        if isAdmin {
            parts.append(Self.bytes(week.bytes ?? 0))
        }
        parts.append(String(localized: "\(week.movies) movies"))
        parts.append(String(localized: "\(week.episodes) episodes"))
        if showBooks {
            parts.append(String(localized: "\(week.books) books"))
        }
        return parts.joined(separator: " · ")
    }

    private var trendSummary: String {
        let known = weeks.filter { !GrowthDates.isBeforeSince(weekStart: $0.start, since: growth.since) }
        guard let last = known.last else { return String(localized: "Weekly growth, no data yet") }
        let best = known.max { $0.metric(admin: isAdmin) < $1.metric(admin: isAdmin) } ?? last
        let unit: (GrowthPeriod) -> String = { isAdmin ? Self.bytes($0.bytes ?? 0) : String(localized: "\($0.titles) titles") }
        let count = known.count
        let current = unit(last)
        let top = unit(best)
        let day = GrowthDates.shortDay(best.start)
        return String(localized: "Weekly growth over \(count) weeks. This week \(current). Busiest week of \(day), \(top).")
    }

    // MARK: Footer

    private var footer: some View {
        HStack {
            Text("\(growth.month.upgrades) upgrades")
            Spacer()
            if let since = growth.since {
                let day = GrowthDates.mediumDay(since)
                Text("Since \(day)")
            }
        }
        .font(.caption2).foregroundStyle(Theme.faint)
    }

    static func bytes(_ value: Int) -> String {
        ByteCountFormatter.string(fromByteCount: Int64(max(value, 0)), countStyle: .file)
    }
}
