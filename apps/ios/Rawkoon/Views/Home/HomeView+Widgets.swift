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
            if !attention.isEmpty {
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

    private var downloadsWidget: some View {
        widgetCard("Downloads", systemImage: "arrow.down.circle") {
            if let speed, speed.connected {
                HStack(spacing: 18) {
                    speedLabel("down", speed.dlSpeed, Theme.muted)
                    speedLabel("up", speed.ulSpeed, Theme.muted)
                }
            } else {
                Text(LocalizedStringKey(speed?.enabled == true ? "Download client offline." : "No download client configured."))
                    .font(.subheadline).foregroundStyle(Theme.muted)
            }
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
            }
        }
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
    private func openAttention(mediaId: Int) {
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
