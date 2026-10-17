import RawkoonKit
import SwiftUI

extension HomeView {
    @ViewBuilder var pipelineCard: some View {
        PipelineCard(pipeline: pipeline, progress: model.downloadProgress)
    }
}

private struct PipelineCard: View {
    @Environment(\.horizontalSizeClass) private var sizeClass

    let pipeline: DashboardPipeline?
    let progress: [Int: [Int: LiveDownload]]
    @State private var expanded = false

    private enum Row: Int, CaseIterable, Identifiable {
        case downloading, delayed, attention, rss, reencode
        var id: Int {
            rawValue
        }
    }

    private var visibleRows: [Row] {
        sizeClass == .compact && !expanded ? Array(Row.allCases.prefix(3)) : Row.allCases
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Text("Pipeline").font(.display(16)).foregroundStyle(Theme.textStrong)
                Text("Admin")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(Theme.muted)
                    .padding(.horizontal, 7).padding(.vertical, 3)
                    .background(Theme.base, in: Capsule())
            }
            .padding(.bottom, 12)
            ForEach(visibleRows) { row in
                if row != visibleRows.first {
                    Rectangle().fill(Theme.border).frame(height: 1).padding(.vertical, 10)
                }
                link(row)
            }
            if sizeClass == .compact, !expanded {
                Rectangle().fill(Theme.border).frame(height: 1).padding(.vertical, 10)
                Button {
                    withRawkoonMotion(RawkoonMotion.spring) { expanded = true }
                } label: {
                    HStack {
                        Text("2 more").font(.caption.weight(.medium))
                        Spacer()
                        Image(systemName: "chevron.down")
                    }
                    .foregroundStyle(Theme.apricotSoft)
                    .frame(minHeight: 32)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.border, lineWidth: 1))
    }

    @ViewBuilder private func link(_ row: Row) -> some View {
        NavigationLink {
            switch row {
            case .downloading, .delayed: ActivityView(initialLane: .queue)
            case .attention, .rss: HealthSettingsView()
            case .reencode: ReencodeAdminView()
            }
        } label: {
            HStack(alignment: .top, spacing: 10) {
                icon(row)
                VStack(alignment: .leading, spacing: 3) {
                    Text(title(row))
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(isIdle(row) ? Theme.muted : Theme.text)
                    Text(subtitle(row))
                        .font(.caption2)
                        .foregroundStyle(Theme.muted)
                        .lineLimit(2)
                    if row == .downloading, pipeline?.downloading.available == true {
                        ForEach(pipeline?.downloading.items.prefix(3) ?? []) { item in
                            downloadLine(item)
                        }
                    }
                }
                Spacer(minLength: 4)
                Text(value(row))
                    .font(.system(.subheadline, design: .monospaced))
                    .foregroundStyle(isIdle(row) ? Theme.faint : Theme.textStrong)
                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Theme.faint)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.rawkoonPressable(scale: 0.98))
    }

    @ViewBuilder private func icon(_ row: Row) -> some View {
        let symbol = switch row {
        case .downloading: "arrow.down"
        case .delayed: "clock"
        case .attention: "exclamationmark.triangle"
        case .rss: "dot.radiowaves.up.forward"
        case .reencode: "gauge.with.dots.needle.67percent"
        }
        let tint: Color = switch row {
        case .downloading: pipeline?.downloading.available == true && (pipeline?.downloading.count ?? 0) > 0 ? Theme.apricot : Theme.faint
        case .delayed: pipeline?.delayed.available == true && (pipeline?.delayed.count ?? 0) > 0 ? Theme.apricot : Theme.faint
        case .attention: pipeline?.attention.available == true && (pipeline?.attention.count ?? 0) > 0 ? Theme.terracotta : Theme.faint
        case .rss: pipeline?.rss.available == true && pipeline?.rss.ok == false ? Theme.terracotta : pipeline?.rss.ok == true ? Theme.seed : Theme.faint
        case .reencode: pipeline?.reencode.available == true && (pipeline?.reencode.active ?? 0) > 0 ? Theme.apricot : Theme.faint
        }
        let tile = Image(systemName: symbol)
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(tint)
            .frame(width: 32, height: 32)
            .background(tint.opacity(0.14), in: RoundedRectangle(cornerRadius: 9))
        if row == .downloading {
            tile.breathingLamp(active: pipeline?.downloading.available == true && (pipeline?.downloading.count ?? 0) > 0)
        } else {
            tile
        }
    }

    private func title(_ row: Row) -> LocalizedStringKey {
        switch row {
        case .downloading: "Downloading"
        case .delayed: "Delayed grabs"
        case .attention: "Needs attention"
        case .rss: "Last RSS run"
        case .reencode: "Re-encoding"
        }
    }

    private func available(_ row: Row) -> Bool {
        switch row {
        case .downloading: pipeline?.downloading.available == true
        case .delayed: pipeline?.delayed.available == true
        case .attention: pipeline?.attention.available == true
        case .rss: pipeline?.rss.available == true
        case .reencode: pipeline?.reencode.available == true
        }
    }

    private func isIdle(_ row: Row) -> Bool {
        guard available(row), let pipeline else { return true }
        return switch row {
        case .downloading: pipeline.downloading.count == 0
        case .delayed: pipeline.delayed.count == 0
        case .attention: pipeline.attention.count == 0
        case .rss: pipeline.rss.lastRunAt == nil
        case .reencode: pipeline.reencode.active == 0 && pipeline.reencode.queued == 0
        }
    }

    private func value(_ row: Row) -> String {
        guard available(row), let pipeline else { return "–" }
        switch row {
        case .downloading: return String(pipeline.downloading.count)
        case .delayed: return String(pipeline.delayed.count)
        case .attention: return String(pipeline.attention.count)
        case .rss:
            let relative = ActivityPresentation.relativeTime(pipeline.rss.lastRunAt)
            return relative.isEmpty ? "–" : relative
        case .reencode: return "\(pipeline.reencode.active)/\(pipeline.reencode.queued)"
        }
    }

    private func subtitle(_ row: Row) -> String {
        guard available(row), let pipeline else { return String(localized: "Couldn't check") }
        switch row {
        case .downloading:
            let speed = max(0, Int64(exactly: pipeline.downloading.speedBytesPerSec.rounded()) ?? 0)
            return "↓ \(ByteCountFormatter.string(fromByteCount: speed, countStyle: .file))/s"
        case .delayed: return pipeline.delayed.count == 0 ? String(localized: "No delayed grabs") : String(localized: "Waiting to grab")
        case .attention: return String(localized: "\(pipeline.attention.alerts) alerts, \(pipeline.attention.gaveUp) gave up")
        case .rss:
            guard pipeline.rss.lastRunAt != nil else { return String(localized: "No RSS runs yet") }
            let result = pipeline.rss.ok == true ? String(localized: "OK") : String(localized: "Failed")
            let found = pipeline.rss.releasesFound ?? 0
            let next = ActivityPresentation.relativeTime(pipeline.rss.nextRunAt)
            return next.isEmpty ? String(localized: "\(result) · \(found) found") : String(localized: "\(result) · \(found) found · next \(next)")
        case .reencode: return String(localized: "\(pipeline.reencode.active) active, \(pipeline.reencode.queued) queued")
        }
    }

    private func downloadLine(_ item: DashboardPipeline.DownloadItem) -> some View {
        let live = item.libraryMediaId.flatMap { progress[$0]?[item.id] }
        let fraction = min(max(live?.progress ?? item.progress, 0), 1)
        return VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 6) {
                Text(item.title).lineLimit(1)
                Spacer(minLength: 4)
                Text("\(Int(fraction * 100))%")
                    .font(.system(.caption2, design: .monospaced))
            }
            .font(.caption2).foregroundStyle(Theme.muted)
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.well)
                    Capsule().fill(Theme.apricot).frame(width: geometry.size.width * fraction)
                }
            }
            .frame(height: 3)
        }
        .padding(.top, 3)
    }
}
