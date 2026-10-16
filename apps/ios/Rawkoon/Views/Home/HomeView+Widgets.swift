import RawkoonKit
import SwiftUI

extension HomeView {
    // MARK: Widgets

    var widgets: some View {
        VStack(spacing: 14) {
            if let np = nowPlaying, np.enabled {
                nowWatchingWidget(np)
            }
            // Downloads and RSS are server-ops widgets: admins only.
            if model.isAdmin {
                downloadsWidget
            }
            if model.isAdmin, let reencodeSummary, reencodeSummary.show {
                ReencodeHomeCard(summary: reencodeSummary)
            }
            if !attention.isEmpty || !visibleMisses.isEmpty {
                attentionWidget
            }
            if model.isAdmin, let rss {
                rssWidget(rss)
            }
            if model.isAdmin, let stats {
                libraryStatsWidget(stats)
            }
        }
        .padding(.horizontal, 16)
    }

    func widgetCard(_ title: LocalizedStringKey, systemImage: String, @ViewBuilder _ content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: systemImage)
                .font(.display(16)).foregroundStyle(Theme.textStrong)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.border, lineWidth: 1))
    }

    private func nowWatchingWidget(_ np: NowPlayingResponse) -> some View {
        widgetCard("Now watching", systemImage: "play.tv") {
            if let sessions = np.sessions, !sessions.isEmpty {
                VStack(spacing: 10) {
                    ForEach(sessions) { s in
                        HStack(spacing: 10) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(s.title ?? String(localized: "Playing")).font(.subheadline.weight(.medium)).foregroundStyle(Theme.text).lineLimit(1)
                                Text(verbatim: [s.user, s.device].compactMap(\.self).filter { !$0.isEmpty }.joined(separator: " · ")).font(.caption2).foregroundStyle(Theme.faint).lineLimit(1)
                            }
                            Spacer()
                            if let p = s.progressPct {
                                Text("\(Int(p))%").font(.system(.caption, design: .monospaced)).foregroundStyle(Theme.muted)
                                    .rawkoonNumeric(p)
                            }
                        }
                    }
                }
            } else {
                Text("Nobody's watching right now.").font(.subheadline).foregroundStyle(Theme.muted)
            }
        }
    }

    /// Active downloads with live progress; the whole card opens Activity's queue.
    private var downloadsWidget: some View {
        NavigationLink {
            ActivityView()
        } label: {
            widgetCard("Downloads", systemImage: "arrow.down.circle") {
                downloadsContent
            }
        }
        .buttonStyle(.rawkoonPressable(scale: 0.98))
        .accessibilityHint("Opens the download queue")
    }

    /// The queue rows with the freshest pushed progress laid over them.
    private var downloadsSummary: HomeDownloadsSummary {
        let lines = downloadRows.compactMap { row -> HomeDownloadLine? in
            guard let known = row.live else { return nil }
            let live = model.downloadProgress[row.mediaId]?[row.downloadId] ?? known
            return HomeDownloadLine(
                id: row.id, title: row.mediaTitle, progress: live.progress, speed: live.downloadSpeed,
                etaSeconds: live.etaSeconds, state: live.state
            )
        }
        return HomeDownloadsSummary.make(lines, limit: 3)
    }

    @ViewBuilder
    private var downloadsContent: some View {
        let summary = downloadsSummary
        if !summary.isEmpty {
            VStack(spacing: 12) {
                ForEach(summary.shown) { line in
                    downloadLine(line)
                }
            }
            HStack(spacing: 12) {
                if summary.hiddenCount > 0 {
                    Text("+\(summary.hiddenCount) more")
                        .font(.caption.weight(.medium)).foregroundStyle(Theme.muted)
                }
                Spacer(minLength: 8)
                Text("See all").font(.caption.weight(.medium)).foregroundStyle(Theme.apricotSoft)
                Image(systemName: "chevron.right").font(.caption2.weight(.semibold)).foregroundStyle(Theme.faint)
            }
        } else if let speed, speed.connected {
            Text("Nothing downloading").font(.subheadline).foregroundStyle(Theme.muted)
            HStack(spacing: 18) {
                speedLabel("down", speed.dlSpeed, Theme.muted)
                speedLabel("up", speed.ulSpeed, Theme.muted)
            }
        } else {
            let offline = speed?.enabled == true
            Text(LocalizedStringKey(offline ? "Download client offline." : "No download client configured."))
                .font(.subheadline).foregroundStyle(Theme.muted)
        }
    }

    private func downloadLine(_ line: HomeDownloadLine) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(line.title).font(.subheadline.weight(.medium)).foregroundStyle(Theme.text).lineLimit(1)
                Spacer(minLength: 8)
                Text("\(Int(line.progress.isFinite ? line.progress * 100 : 0))%")
                    .font(.system(.caption, design: .monospaced)).foregroundStyle(Theme.muted)
                    .rawkoonNumeric(line.progress.isFinite ? line.progress * 100 : 0)
            }
            DuskProgress(
                value: line.progress.isFinite ? line.progress : 0,
                isActive: DownloadMotion.isRunning(state: line.state, speed: line.speed)
            )
            HStack(spacing: 10) {
                if DownloadPhase.classify(line.state) == .importing {
                    Text("Importing").foregroundStyle(Theme.importing)
                } else {
                    Text("↓ \(Formatters.speed(line.speed, useAll: true))").foregroundStyle(Theme.apricotSoft)
                    if let eta = Formatters.etaSeconds(line.etaSeconds) {
                        Text("ETA \(eta)").foregroundStyle(Theme.faint)
                    }
                }
                Spacer(minLength: 0)
            }
            .font(.system(.caption2, design: .monospaced))
        }
        .accessibilityElement(children: .combine)
    }

    /// Reads the queue and the wanted list that feed the Downloads and Needs-attention cards.
    func loadQueueAndMisses() async {
        guard let client = model.api() else { return }
        if model.isAdmin {
            do {
                downloadRows = try await ActivityView.fetchQueueRows(client: client)
            } catch is CancellationError {
                return
            } catch {
                // Stale progress would read as live, so a failed fetch empties the card.
                downloadRows = []
            }
        }
        // Misses only change on a search, so a failed fetch keeps the last list.
        if model.isAdmin, let wanted = try? await client.libraryList(status: "wanted", limit: 100).items {
            wantedMisses = LastSearchNote.recentMisses(wanted, limit: .max) { $0.lastSearchNote }
        }
    }

    private func speedLabel(_ dir: String, _ bytes: Double, _ tint: Color) -> some View {
        // `bytes <= 0` is false for .nan/.infinity (and finite overflow slips
        // past too), so guarding here rather than at the comparison: both would
        // otherwise fall through to a trapping Int64 init. dlSpeed/ulSpeed are
        // server-decoded Doubles, so an overflowing literal decodes to .infinity.
        let safeBytes = bytes.isFinite && bytes > 0 ? (Int64(exactly: bytes.rounded()) ?? 0) : 0
        let text = safeBytes <= 0 ? "0 KB/s"
            : "\(ByteCountFormatter.string(fromByteCount: safeBytes, countStyle: .file))/s"
        return HStack(spacing: 5) {
            Image(systemName: dir == "down" ? "arrow.down" : "arrow.up").font(.caption2).foregroundStyle(tint)
            Text(text).font(.system(.subheadline, design: .monospaced)).foregroundStyle(Theme.text)
                .rawkoonNumeric(Double(safeBytes))
        }
    }

    private var attentionWidget: some View {
        widgetCard("Needs attention", systemImage: "exclamationmark.triangle") {
            VStack(spacing: 10) {
                ForEach(attention.prefix(5)) { item in
                    attentionRow(item)
                }
                ForEach(visibleMisses.prefix(Self.missCap)) { item in
                    missRow(item)
                }
                if !visibleMisses.isEmpty {
                    NavigationLink {
                        MissingLibraryView()
                    } label: {
                        HStack(spacing: 6) {
                            Spacer(minLength: 0)
                            Text("See all missing").font(.caption.weight(.medium)).foregroundStyle(Theme.apricotSoft)
                            Image(systemName: "chevron.right").font(.caption2.weight(.semibold))
                                .foregroundStyle(Theme.faint)
                        }
                        .frame(minHeight: 32)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    static let missCap = 3

    /// Admin-only like the Downloads card, and never repeating a title the attention feed already lists.
    private var visibleMisses: [LibraryMedia] {
        guard model.isAdmin else { return [] }
        let listed = Set(attention.compactMap(\.mediaId))
        return wantedMisses.filter { !listed.contains($0.id) }
    }

    /// A wanted title whose last search found nothing; tapping opens its page.
    private func missRow(_ item: LibraryMedia) -> some View {
        Button {
            attentionTarget = AttentionRoute(
                id: item.id, tmdbId: item.tmdbId, mediaType: item.type == "show" ? "tv" : "movie",
                title: item.title, posterUrl: item.posterUrl
            )
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Circle().fill(Theme.terracotta).frame(width: 7, height: 7).padding(.top, 5)
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title).font(.subheadline.weight(.medium)).foregroundStyle(Theme.text).lineLimit(1)
                    if let note = item.lastSearchNote {
                        Text(verbatim: LastSearchCopy.headline(note))
                            .font(.caption2).foregroundStyle(Theme.muted).lineLimit(1)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right").font(.caption2.weight(.semibold)).foregroundStyle(Theme.faint)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.rawkoonPressable(scale: 0.98))
    }

    /// A row tappable through to detail when it carries a library id; otherwise
    /// a plain informational row.
    @ViewBuilder
    private func attentionRow(_ item: AttentionItem) -> some View {
        if let mediaId = item.mediaId {
            Button {
                openAttention(mediaId: mediaId)
            } label: {
                attentionRowContent(item, busy: resolvingAttentionId == mediaId)
            }
            .buttonStyle(.rawkoonPressable(scale: 0.98))
            // Opening resolves the item from the server; the row still reads fine offline.
            .disabled(resolvingAttentionId != nil)
            .requiresConnection(model.isOffline)
        } else {
            attentionRowContent(item, busy: false)
        }
    }

    private func attentionRowContent(_ item: AttentionItem, busy: Bool) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Circle().fill(Theme.terracotta).frame(width: 7, height: 7).padding(.top, 5)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.mediaTitle ?? item.kind ?? "Item").font(.subheadline.weight(.medium)).foregroundStyle(Theme.text).lineLimit(1)
                if let detail = item.detail {
                    Text(detail).font(.caption2).foregroundStyle(Theme.muted).lineLimit(2)
                }
            }
            Spacer()
            if busy {
                ProgressView().tint(Theme.muted)
            } else if item.mediaId != nil {
                Image(systemName: "chevron.right").font(.caption2.weight(.semibold)).foregroundStyle(Theme.faint)
            }
        }
        .contentShape(Rectangle())
    }

    /// Resolve a library item by id (the attention feed omits tmdbId/poster) and
    /// push its detail. Silent no-op on missing api; toasts on fetch failure.
    func openAttention(mediaId: Int) {
        guard let client = model.api(), resolvingAttentionId == nil else { return }
        resolvingAttentionId = mediaId
        Task {
            defer { resolvingAttentionId = nil }
            if let item = try? await client.libraryItem(id: mediaId) {
                attentionTarget = AttentionRoute(
                    id: item.id,
                    tmdbId: item.tmdbId,
                    mediaType: item.type == "show" ? "tv" : "movie",
                    title: item.title,
                    posterUrl: item.posterUrl
                )
            } else {
                model.toast(String(localized: "Couldn't open that item."), style: .error)
            }
        }
    }

    private func rssWidget(_ r: RssStatusResponse) -> some View {
        widgetCard("RSS", systemImage: "dot.radiowaves.up.forward") {
            if let run = r.lastRun {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        StatusBadge(text: run.status == "error" ? "Error" : "OK",
                                    tint: run.status == "error" ? Theme.terracotta : Theme.seed)
                        Text("\(run.releasesFound ?? 0) found · \(run.releasesGrabbed ?? 0) grabbed")
                            .font(.system(.caption, design: .monospaced)).foregroundStyle(Theme.muted)
                    }
                    if let err = run.error {
                        Text(err).font(.caption2).foregroundStyle(Theme.terracotta).lineLimit(1)
                    }
                }
            } else {
                Text("No RSS runs yet.").font(.subheadline).foregroundStyle(Theme.muted)
            }
        }
    }
}
