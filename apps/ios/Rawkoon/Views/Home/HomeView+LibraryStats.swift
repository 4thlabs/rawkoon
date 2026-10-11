import RawkoonKit
import SwiftUI

extension HomeView {
    // MARK: Library stats widget (admin)

    func libraryStatsWidget(_ s: LibraryStats) -> some View {
        widgetCard("Library", systemImage: "internaldrive") {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 18) {
                    statFigure(s.totalMovies, "Movies")
                    statFigure(s.totalShows, "Shows")
                    statFigure(s.downloaded, "Downloaded")
                    if s.wanted > 0 {
                        statFigure(s.wanted, "Wanted")
                    }
                    if s.returningSeries > 0 {
                        statFigure(s.returningSeries, "Returning")
                    }
                    Spacer(minLength: 0)
                }
                HStack(spacing: 6) {
                    Text("Storage").font(.caption2).foregroundStyle(Theme.faint)
                    Text(byteString(s.storageUsedBytes))
                        .font(.system(.subheadline, design: .monospaced)).foregroundStyle(Theme.text)
                        .rawkoonNumeric(Double(s.storageUsedBytes))
                }
                let bars = orderedStorageBars(s.storageByResolution)
                if !bars.isEmpty {
                    storageBars(bars, total: s.storageUsedBytes)
                }
                if let total = s.diskTotalBytes, let free = s.diskFreeBytes, total > 0 {
                    diskGauge(total: total, free: free)
                }
            }
        }
    }

    private func statFigure(_ value: Int, _ label: LocalizedStringKey) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(String(value))
                .font(.system(.title3, design: .rounded).weight(.semibold)).foregroundStyle(Theme.textStrong)
                .rawkoonNumeric(Double(value))
            Text(label).font(.caption2).foregroundStyle(Theme.faint)
        }
    }

    /// Storage rows with a value, ordered low→high resolution with unknown last.
    func orderedStorageBars(_ rows: [StorageByResolution]) -> [StorageByResolution] {
        rows.filter { $0.sizeBytes > 0 }.sorted { resolutionRank($0.resolution) < resolutionRank($1.resolution) }
    }

    /// Bars are each resolution's share of total library storage, so their
    /// widths sum to the whole rather than the largest bucket always filling.
    private func storageBars(_ rows: [StorageByResolution], total: Int) -> some View {
        let denom = max(total, 1)
        return VStack(spacing: 8) {
            ForEach(rows) { row in
                VStack(spacing: 4) {
                    HStack {
                        Text(resolutionLabel(row.resolution)).font(.caption).foregroundStyle(Theme.muted)
                        Spacer()
                        Text(byteString(row.sizeBytes))
                            .font(.system(.caption, design: .monospaced)).foregroundStyle(Theme.text)
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Theme.base)
                            Capsule().fill(Theme.seed)
                                .frame(width: max(geo.size.width * CGFloat(row.sizeBytes) / CGFloat(denom), 2))
                        }
                    }
                    .frame(height: 6)
                }
            }
        }
    }

    /// Volume capacity: used fill over the whole disk, with a "free of total" label.
    private func diskGauge(total: Int, free: Int) -> some View {
        let used = max(min(total - free, total), 0)
        let fraction = CGFloat(used) / CGFloat(max(total, 1))
        return VStack(spacing: 4) {
            HStack {
                Text("Disk").font(.caption).foregroundStyle(Theme.muted)
                Spacer()
                Text("\(byteString(free)) free of \(byteString(total))")
                    .font(.system(.caption, design: .monospaced)).foregroundStyle(Theme.text)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.base)
                    Capsule().fill(fraction > 0.9 ? Theme.terracotta : Theme.apricot)
                        .frame(width: max(geo.size.width * fraction, 2))
                }
            }
            .frame(height: 6)
        }
    }

    func resolutionRank(_ r: String) -> Int {
        switch r {
        case "480p": 0
        case "720p": 1
        case "1080p": 2
        case "4k": 3
        default: 4
        }
    }

    func resolutionLabel(_ r: String) -> String {
        switch r {
        case "4k": "4K"
        case "unknown": String(localized: "SD / unknown")
        default: r
        }
    }

    func byteString(_ bytes: Int) -> String {
        let safe = Int64(exactly: bytes) ?? .max
        return ByteCountFormatter.string(fromByteCount: max(safe, 0), countStyle: .file)
    }
}
