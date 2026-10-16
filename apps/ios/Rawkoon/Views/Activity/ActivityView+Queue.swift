import RawkoonKit
import SwiftUI

/// Queue cards, phase filters, and loading.
extension ActivityView {
    // MARK: Queue

    struct QueueRow: Identifiable {
        let id: String
        let mediaId: Int
        let downloadId: Int
        let mediaTitle: String
        let releaseTitle: String
        let live: LiveDownload
        let failed: Bool
        let failReason: String?
        let postProcessError: String?

        /// The one status and reason the card shows; nil once the download is only seeding.
        var line: QueueStatusLine? {
            QueueClassifier.line(
                state: live.state, failed: failed, failReason: failReason, postProcessError: postProcessError
            )
        }
    }

    private var queueStatusCounts: [QueueStatus: Int] {
        Dictionary(grouping: inFlightRows) { $0.line?.status ?? .downloading }.mapValues(\.count)
    }

    /// Downloads still in flight; a finished one that is only seeding is not in the queue.
    private var inFlightRows: [QueueRow] {
        queueRows.filter { $0.line != nil }
    }

    private var visibleQueueRows: [QueueRow] {
        guard let filter = queueStatusFilter else { return inFlightRows }
        return inFlightRows.filter { $0.line?.status == filter }
    }

    var queueContent: some View {
        // A container, not a bare conditional, so the lane slide and the state swaps never share one transition.
        ZStack(alignment: .top) {
            if loadingQueue, inFlightRows.isEmpty {
                LazyVStack(spacing: 10) {
                    ForEach(0 ..< 4, id: \.self) { _ in
                        queueSkeletonCard
                    }
                }
                .padding(16)
                .transition(.rawkoonSwap)
            } else if let queueError, inFlightRows.isEmpty {
                errorView(queueError)
                    .transition(.rawkoonSwap)
            } else if inFlightRows.isEmpty {
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
                    queueStatusBar
                    LazyVStack(spacing: 10) {
                        ForEach(visibleQueueRows) { row in
                            queueCard(row)
                                .rawkoonEntrance(id: row.id)
                                .transition(.rawkoonSwap)
                        }
                    }
                    .rawkoonEntranceScope()
                    .rawkoonMotion(RawkoonMotion.snappy, value: queueStatusFilter)
                    // A live reload that drops a finished item fades it out instead of cutting.
                    .rawkoonMotion(RawkoonMotion.spring, value: inFlightRows.map(\.id))
                }
                .padding(16)
                .transition(.rawkoonSwap)
            }
        }
        .rawkoonMotion(
            RawkoonMotion.spring,
            value: Self.laneState(loading: loadingQueue, failed: queueError != nil, isEmpty: inFlightRows.isEmpty)
        )
    }

    /// Live status chips: a tap filters the visible cards to that status, a
    /// second tap clears it. Counts are computed from every queued row.
    private var queueStatusBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(QueueStatus.allCases, id: \.self) { status in
                    if let count = queueStatusCounts[status], count > 0 {
                        queueStatusChip(status, count: count)
                    }
                }
            }
        }
    }

    private func queueStatusChip(_ status: QueueStatus, count: Int) -> some View {
        let selected = queueStatusFilter == status
        return Button {
            queueStatusFilter = selected ? nil : status
        } label: {
            HStack(spacing: 6) {
                Circle()
                    .fill(status.tint)
                    .frame(width: 7, height: 7)
                Text(status.label)
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
                    if let reason = row.line?.reason.text {
                        Text(verbatim: reason)
                            .font(.caption)
                            .foregroundStyle(row.line?.status == .failed ? Theme.terracotta : Theme.muted)
                            .lineLimit(2)
                    }
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
                    if let status = row.line?.status {
                        StatusBadge(text: status.label, tint: status.tint)
                            .id(status)
                    }
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

    static func queueRows(
        media list: [LibraryMedia],
        downloads: [Int: [DownloadHistoryItem]]
    ) -> [QueueRow] {
        list.flatMap { media in
            (downloads[media.id] ?? []).compactMap { item in
                item.live.map { live in
                    QueueRow(
                        id: "\(media.id)-\(item.id)",
                        mediaId: media.id,
                        downloadId: item.id,
                        mediaTitle: media.title,
                        releaseTitle: item.releaseTitle,
                        live: live,
                        failed: item.failed,
                        failReason: item.failReason,
                        postProcessError: item.postProcessError
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
            queueRows = try await Self.fetchQueueRows(client: client)
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

    /// Every live download of every downloading title; Home's Downloads card reads the same list.
    static func fetchQueueRows(client: APIClient) async throws -> [QueueRow] {
        let list = try await client.libraryList(status: "downloading")
        // Fetch every media's downloads concurrently instead of one round-trip
        // per media; a per-media failure falls back to that media's saved
        // downloads rather than aborting the whole queue.
        let byId = try await withThrowingTaskGroup(of: (Int, [DownloadHistoryItem]).self) { group in
            for media in list.items {
                group.addTask {
                    do {
                        return try await (media.id, client.downloads(libraryId: media.id).items)
                    } catch is CancellationError {
                        throw CancellationError()
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
        try Task.checkCancellation()
        return queueRows(media: list.items, downloads: byId)
    }
}

extension QueueStatus {
    var label: LocalizedStringKey {
        switch self {
        case .downloading: "Downloading"
        case .waiting: "Waiting"
        case .importing: "Importing"
        case .stalled: "Stalled"
        case .failed: "Failed"
        }
    }

    var tint: Color {
        switch self {
        case .downloading: Theme.importing
        case .waiting: Theme.muted
        case .importing: Theme.seed
        case .stalled: Theme.apricotSoft
        case .failed: Theme.terracotta
        }
    }
}

extension QueueReason {
    /// The reason line, worded for the card; nil when the status says it all.
    var text: String? {
        switch self {
        case .none: nil
        case .paused: String(localized: "Paused in the download client")
        case .queued: String(localized: "Queued behind other downloads")
        case .checking: String(localized: "Checking files already on disk")
        case .fetchingMetadata: String(localized: "Fetching the torrent's details")
        case .noPeers: String(localized: "No one is sending data right now")
        case .importing: String(localized: "Moving the files into your library")
        case .clientError: String(localized: "The download client reported an error")
        case let .detail(text): text
        }
    }
}
