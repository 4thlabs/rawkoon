import RawkoonKit
import SwiftUI

/// Queue cards, phase filters, and loading.
extension ActivityView {
    // MARK: Queue

    struct QueueRow: Identifiable {
        let id: String
        let mediaTitle: String
        let releaseTitle: String
        let live: LiveDownload
    }

    /// The three live phases a queued download can be in. Derived locally from
    /// `LiveDownload.state` so the counts stay in sync with the visible cards.
    enum QueuePhase: String, CaseIterable, Identifiable {
        case downloading, importing, seeding
        var id: String {
            rawValue
        }

        var label: LocalizedStringKey {
            switch self {
            case .downloading: "Downloading"
            case .importing: "Importing"
            case .seeding: "Seeding"
            }
        }

        var tint: Color {
            switch self {
            case .downloading: Theme.terracotta
            case .importing: Theme.importing
            case .seeding: Theme.seed
            }
        }
    }

    func phase(of state: String) -> QueuePhase {
        let lower = state.lowercased()
        if lower.contains("seed") || lower.contains("complete") {
            return .seeding
        }
        if lower.contains("import") || lower.contains("process") {
            return .importing
        }
        return .downloading
    }

    private var queuePhaseCounts: [QueuePhase: Int] {
        Dictionary(grouping: queueRows) { phase(of: $0.live.state) }.mapValues(\.count)
    }

    private var visibleQueueRows: [QueueRow] {
        guard let filter = queuePhaseFilter else { return queueRows }
        return queueRows.filter { phase(of: $0.live.state) == filter }
    }

    var queueContent: some View {
        // A container, not a bare conditional, so the lane slide and the state swaps never share one transition.
        ZStack(alignment: .top) {
            if loadingQueue, queueRows.isEmpty {
                LazyVStack(spacing: 10) {
                    ForEach(0 ..< 4, id: \.self) { _ in
                        queueSkeletonCard
                    }
                }
                .padding(16)
                .transition(.rawkoonSwap)
            } else if let queueError, queueRows.isEmpty {
                errorView(queueError)
                    .transition(.rawkoonSwap)
            } else if queueRows.isEmpty {
                ContentUnavailableView(
                    "Nothing downloading",
                    systemImage: "arrow.down.circle",
                    description: Text("The queue is empty right now.")
                )
                .rawkoonLivingSymbol(.empty)
                .frame(maxWidth: .infinity, minHeight: 420)
                .transition(.rawkoonSwap)
            } else {
                VStack(spacing: 12) {
                    queuePhaseBar
                    LazyVStack(spacing: 10) {
                        ForEach(visibleQueueRows) { row in
                            queueCard(row)
                                .rawkoonEntrance(id: row.id)
                                .transition(.rawkoonSwap)
                        }
                    }
                    .rawkoonEntranceScope()
                    .rawkoonMotion(RawkoonMotion.snappy, value: queuePhaseFilter)
                    // A live reload that drops a finished item fades it out instead of cutting.
                    .rawkoonMotion(RawkoonMotion.spring, value: queueRows.map(\.id))
                }
                .padding(16)
                .transition(.rawkoonSwap)
            }
        }
        .rawkoonMotion(
            RawkoonMotion.spring,
            value: Self.laneState(loading: loadingQueue, failed: queueError != nil, isEmpty: queueRows.isEmpty)
        )
    }

    /// Live status chips: a tap filters the visible cards to that phase, a
    /// second tap clears it. Counts are computed from every queued row.
    private var queuePhaseBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(QueuePhase.allCases) { phase in
                    if let count = queuePhaseCounts[phase], count > 0 {
                        queuePhaseChip(phase, count: count)
                    }
                }
            }
        }
    }

    private func queuePhaseChip(_ phase: QueuePhase, count: Int) -> some View {
        let selected = queuePhaseFilter == phase
        return Button {
            queuePhaseFilter = selected ? nil : phase
        } label: {
            HStack(spacing: 6) {
                Circle()
                    .fill(phase.tint)
                    .frame(width: 7, height: 7)
                Text(phase.label)
                    .font(.system(.caption, design: .rounded).weight(.medium))
                Text("\(count)")
                    .font(.system(.caption, design: .monospaced))
            }
            .foregroundStyle(selected ? Theme.textStrong : Theme.muted)
            .selectableChipChrome(selected: selected, horizontalPadding: 12)
        }
        .buttonStyle(.plain)
    }

    private func queueCard(_ row: QueueRow) -> some View {
        let complete = DownloadMotion.isComplete(state: row.live.state)
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(row.mediaTitle)
                        .font(.display(15))
                        .foregroundStyle(Theme.textStrong)
                        .lineLimit(2)
                    Text(row.releaseTitle)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(Theme.faint)
                        .lineLimit(1)
                }
                Spacer(minLength: 8)
                if complete {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.subheadline)
                        .foregroundStyle(Theme.seed)
                        .accessibilityHidden(true)
                        .transition(.rawkoonSwap)
                }
                // One slot keyed by the state, so a state change crossfades the badge in place.
                ZStack(alignment: .trailing) {
                    statusBadge(row.live.state, tint: stateTint(row.live.state))
                        .id(row.live.state)
                }
            }

            DuskProgress(
                value: row.live.progress,
                isActive: DownloadMotion.isRunning(state: row.live.state, speed: row.live.downloadSpeed)
            )

            HStack(spacing: 10) {
                Text("↓ \(Formatters.speed(row.live.downloadSpeed, useAll: true))")
                    .foregroundStyle(Theme.apricotSoft)
                    .rawkoonNumeric(row.live.downloadSpeed.isFinite ? row.live.downloadSpeed : 0)
                Text("\(Int(row.live.progress * 100))%")
                    .foregroundStyle(Theme.muted)
                    .rawkoonNumeric(Double(Int(row.live.progress * 100)))
                if let eta = Formatters.etaSeconds(row.live.etaSeconds) {
                    Text("ETA \(eta)")
                        .foregroundStyle(Theme.faint)
                        .rawkoonNumeric(Double(row.live.etaSeconds ?? 0))
                }
                Spacer()
            }
            .font(.system(.caption, design: .monospaced))
        }
        .padding(12)
        .activityCard(cornerRadius: 13)
        .rawkoonMotion(RawkoonMotion.snappy, value: row.live.state)
        // The check burst: only a finish seen on screen counts, never a card that loads already complete.
        .rawkoonCelebrate(
            trigger: complete,
            ring: .roundedRect(cornerRadius: 13),
            haptic: .downloadComplete,
            when: { !$0 && $1 }
        )
    }

    /// Warm skeleton row shown while the queue's first load is in flight.
    private var queueSkeletonCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 8) {
                ShimmerView(cornerRadius: 8)
                    .frame(width: 44, height: 44)
                VStack(alignment: .leading, spacing: 6) {
                    ShimmerView(cornerRadius: 4).frame(height: 14)
                    ShimmerView(cornerRadius: 4).frame(width: 120, height: 11)
                }
            }
            ShimmerView(cornerRadius: 4).frame(height: 6)
        }
        .padding(12)
        .activityCard(cornerRadius: 13)
    }

    private func stateTint(_ state: String) -> Color {
        let lower = state.lowercased()
        if lower.contains("seed") || lower.contains("complete") {
            return Theme.seed
        }
        if lower.contains("import") || lower.contains("process") {
            return Theme.importing
        }
        if lower.contains("download") {
            return Theme.importing
        }
        return Theme.muted
    }

    static func queueRows(
        media list: [LibraryMedia],
        downloads: [Int: [DownloadHistoryItem]]
    ) -> [QueueRow] {
        list.flatMap { media in
            (downloads[media.id] ?? []).compactMap { item in
                item.live.map { live in
                    QueueRow(
                        id: "\(media.id)-\(item.id)",
                        mediaTitle: media.title,
                        releaseTitle: item.releaseTitle,
                        live: live
                    )
                }
            }
        }
    }

    nonisolated static func cachedDownloads(client: APIClient, libraryId: Int) -> [DownloadHistoryItem] {
        let cached: Cached<DownloadsResponse>? = client.cached("/api/library/\(libraryId)/downloads")
        return cached?.value.items ?? []
    }

    func loadQueue() async {
        if !didLoadQueue {
            loadingQueue = true
        }
        queueError = nil
        defer {
            loadingQueue = false
            // A cancelled cold load showed nothing, so the next one still opens on the skeleton.
            if !Task.isCancelled {
                didLoadQueue = true
            }
        }

        guard let client = model.api() else {
            queueError = String(localized: "Not signed in.")
            return
        }

        do {
            let list = try await client.libraryList(status: "downloading")
            // Fetch every media's downloads concurrently instead of one round-trip
            // per media; a per-media failure falls back to that media's saved
            // downloads rather than aborting the whole queue.
            let byId = try await withThrowingTaskGroup(of: (Int, [DownloadHistoryItem]).self) { group in
                for media in list.items {
                    group.addTask {
                        do {
                            return try await (media.id, client.downloads(libraryId: media.id).items)
                        } catch {
                            return (media.id, Self.cachedDownloads(client: client, libraryId: media.id))
                        }
                    }
                }
                var map: [Int: [DownloadHistoryItem]] = [:]
                for try await (id, items) in group {
                    map[id] = items
                }
                return map
            }
            queueRows = Self.queueRows(media: list.items, downloads: byId)
        } catch let error as APIError {
            queueError = message(for: error)
        } catch is CancellationError {
            // A lane switch or live reload cancelled this fetch — not a real failure.
        } catch {
            if Task.isCancelled {
                return
            }
            queueError = String(localized: "Can't reach the server. Try again in a moment.")
        }
    }
}
