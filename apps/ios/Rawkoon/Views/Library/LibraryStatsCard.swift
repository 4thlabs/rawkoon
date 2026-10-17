import RawkoonKit
import SwiftUI

struct LibraryStatsCard: View {
    let stats: LibraryStats

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Library", systemImage: "internaldrive")
                .font(.display(16))
                .foregroundStyle(Theme.textStrong)
            HStack(alignment: .top, spacing: 18) {
                statFigure(stats.totalMovies, "Movies")
                statFigure(stats.totalShows, "Shows")
                statFigure(stats.downloaded, "Downloaded")
                if stats.wanted > 0 {
                    statFigure(stats.wanted, "Wanted")
                }
                if stats.returningSeries > 0 {
                    statFigure(stats.returningSeries, "Returning")
                }
                Spacer(minLength: 0)
            }
            HStack(spacing: 6) {
                Text("Storage").font(.caption2).foregroundStyle(Theme.faint)
                Text(byteString(stats.storageUsedBytes))
                    .font(.system(.subheadline, design: .monospaced)).foregroundStyle(Theme.text)
                    .rawkoonNumeric(Double(stats.storageUsedBytes))
            }
            let bars = orderedStorageBars(stats.storageByResolution)
            if !bars.isEmpty {
                storageBars(bars, total: stats.storageUsedBytes)
            }
            if let total = stats.diskTotalBytes, let free = stats.diskFreeBytes, total > 0 {
                diskGauge(total: total, free: free)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.border, lineWidth: 1))
    }

    private func statFigure(_ value: Int, _ label: LocalizedStringKey) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(String(value))
                .font(.system(.title3, design: .rounded).weight(.semibold)).foregroundStyle(Theme.textStrong)
                .rawkoonNumeric(Double(value))
            Text(label).font(.caption2).foregroundStyle(Theme.faint)
        }
    }

    func orderedStorageBars(_ rows: [StorageByResolution]) -> [StorageByResolution] {
        rows.filter { $0.sizeBytes > 0 }.sorted { resolutionRank($0.resolution) < resolutionRank($1.resolution) }
    }

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

    func resolutionRank(_ resolution: String) -> Int {
        switch resolution {
        case "480p": 0
        case "720p": 1
        case "1080p": 2
        case "4k": 3
        default: 4
        }
    }

    func resolutionLabel(_ resolution: String) -> String {
        switch resolution {
        case "4k": "4K"
        case "unknown": String(localized: "SD / unknown")
        default: resolution
        }
    }

    func byteString(_ bytes: Int) -> String {
        let safe = Int64(exactly: bytes) ?? .max
        return ByteCountFormatter.string(fromByteCount: max(safe, 0), countStyle: .file)
    }
}
