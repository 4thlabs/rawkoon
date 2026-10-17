import RawkoonKit
import SwiftUI

struct ReleaseSearchResults: View {
    @Environment(AppModel.self) private var model
    let session: ReleaseSearchSession
    let filters: ReleaseSearchFilters
    let onGrabbed: (() -> Void)?
    /// True once the list is scrolled away from the top; the sheet then ignores a drag-to-dismiss.
    @Binding var scrolledAway: Bool
    @State private var fallbackOpen = false

    var body: some View {
        VStack(spacing: 0) {
            notices
            ZStack { content }
        }
    }

    /// Notes that slide in above the results: admin-only, warnings, a failed refresh or grab, the AI pick.
    @ViewBuilder
    private var notices: some View {
        if let adminOnlyNote = session.adminOnlyNote {
            Text(adminOnlyNote)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.terracotta)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
                .transition(.rawkoonReveal)
        }

        if !session.indexerWarnings.isEmpty {
            warningStrip
                .transition(.rawkoonReveal)
        }

        // A failed refresh keeps the earlier results; say so above them.
        if let errorMessage = session.errorMessage, !session.releases.isEmpty {
            Text(errorMessage)
                .font(.subheadline)
                .foregroundStyle(Theme.terracotta)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
                .transition(.rawkoonReveal)
        }

        if let grabError = session.grabError {
            Text(grabError)
                .font(.subheadline)
                .foregroundStyle(Theme.terracotta)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
                .transition(.rawkoonReveal)
        }

        if let download = session.activeDownload {
            downloadingCard(download)
                .transition(.rawkoonReveal)
        }

        // Replace is the only grab while a download runs, so the AI banner's plain grab would just fail.
        if session.aiEnabled, !session.aiPickDismissed, session.activeDownload == nil {
            AiPickBanner(
                aiPickLoading: session.aiPickLoading,
                aiPickError: session.aiPickError,
                aiPickBudgetReached: session.aiPickBudgetReached,
                aiPickedRelease: session.aiPickedRelease,
                aiPickGrabbed: session.aiPickGrabbed,
                aiPick: session.aiPick,
                grabbingGuid: session.grabbingGuid,
                onRetry: { await session.runAiPick(model: model, force: true) },
                onGrab: { release in await session.grabFromBanner(release, model: model, onGrabbed: onGrabbed) },
                onDismiss: { session.aiPickDismissed = true }
            )
            .transition(.rawkoonReveal)
        }
    }

    private var warningStrip: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(session.indexerWarnings) { warning in
                Text("\(warning.name): \(warning.error)")
                    .font(.caption2)
                    .foregroundStyle(Theme.terracotta)
                    .lineLimit(2)
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    @ViewBuilder
    private var content: some View {
        if session.isLoading {
            ReleaseSheetStateView(kind: .searching)
        } else if model.isOffline, session.releases.isEmpty {
            ReleaseSheetStateView(kind: .offline)
        } else if let errorMessage = session.errorMessage, session.releases.isEmpty {
            ReleaseSheetStateView(kind: .failed(errorMessage))
        } else if session.releases.isEmpty {
            ReleaseSheetStateView(kind: .empty(String(localized: "Nothing grabbable found for this search.")))
        } else if filters.filteredReleases(in: session).isEmpty {
            // Results came back but the active filters (commonly "Hide rejected")
            // hide them all — say so and offer a reset, mirroring the web
            // "No matches" + Reset view empty state instead of a blank sheet.
            ContentUnavailableView {
                Label("No matches", systemImage: "line.3.horizontal.decrease.circle")
            } description: {
                Text("\(session.releases.count) results are hidden by your filters.")
            } actions: {
                Button("Reset view") { filters.resetView() }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.terracotta)
            }
            .rawkoonLivingSymbol(.empty)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .transition(.rawkoonSwap)
        } else {
            releaseList
        }
    }

    private func downloadingCard(_ download: DownloadHistoryItem) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Label("Downloading now", systemImage: "arrow.down.circle.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Theme.apricot)
                Spacer(minLength: 8)
                if let live = download.live {
                    Text(verbatim: "\(Int((live.progress * 100).rounded()))%")
                        .font(.system(.caption, design: .monospaced).weight(.semibold))
                        .foregroundStyle(Theme.textStrong)
                }
            }
            Text(download.releaseTitle)
                .font(.footnote)
                .foregroundStyle(Theme.text)
                .lineLimit(2)
            Text("Pick another release below to replace it.")
                .font(.caption)
                .foregroundStyle(Theme.muted)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.apricot.opacity(0.4), lineWidth: 1))
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    // MARK: List

    private var releaseList: some View {
        let visible = filters.sortedReleases(in: session)
        let primary = visible.filter { $0.languageFallback != true }
        let fallback = visible.filter { $0.languageFallback == true }
        let visibleGuids = Set(primary.map(\.guid))
        let best = ReleaseSheetLogic.pickBestMatch(
            session.releases.filter { visibleGuids.contains($0.guid) },
            aiPickKey: session.aiPickBadgeKey, blockedGuids: session.blockedGuids
        )
        let main = primary.filter { $0.guid != best?.guid }
        // With no preferred-language release, the other versions lead, expanded.
        let leadWithFallback = session.languageFallbackSummary != nil && !fallback.isEmpty
        let hidden = filters.hiddenCount(in: session)
        return ScrollView {
            LazyVStack(spacing: 10) {
                if hidden > 0 {
                    hiddenLine(hidden)
                }
                if leadWithFallback {
                    fallbackSection(fallback, lead: true)
                }
                if let best {
                    row(best, isBest: true)
                }
                ForEach(main) { row($0) }
                if !leadWithFallback, !fallback.isEmpty {
                    fallbackSection(fallback, lead: false)
                }
            }
            .padding(16)
            .rawkoonEntranceScope()
        }
        .onScrollGeometryChange(for: Bool.self) { $0.contentOffset.y > 24 } action: { _, away in
            scrolledAway = away
        }
        .transition(.rawkoonSwap)
    }

    private func hiddenLine(_ count: Int) -> some View {
        HStack(spacing: 6) {
            Text("\(count) hidden by filters")
                .font(.footnote)
                .foregroundStyle(Theme.muted)
            Button("Show") { filters.revealHidden() }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Theme.apricot)
                .frame(minHeight: 44)
            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private func fallbackSection(_ releases: [ReleaseItem], lead: Bool) -> some View {
        let summary = session.languageFallbackSummary.map { ReleaseSheetLogic.fallbackSummary(counts: $0.counts) }
        let isFrench = summary?.isFrench ?? releases.allSatisfy {
            ReleaseSheetLogic.isFrenchTag($0.languageFallbackTag ?? "")
        }
        VStack(alignment: .leading, spacing: 10) {
            if lead, let missing = session.languageFallbackSummary?.missing, !missing.isEmpty {
                fallbackBanner(missing: ReleaseSheetLogic.joinLanguages(missing, or: String(localized: "or")))
            }
            Button {
                fallbackOpen.toggle()
            } label: {
                HStack(spacing: 6) {
                    if isFrench {
                        Text("Other French versions · \(releases.count)")
                    } else {
                        Text("Other languages · \(releases.count)")
                    }
                    if !lead {
                        Image(systemName: fallbackOpen ? "chevron.up" : "chevron.down")
                            .font(.system(size: 10, weight: .bold))
                    }
                    Spacer(minLength: 0)
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(Theme.muted)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(lead)
            if lead || fallbackOpen {
                ForEach(releases) { row($0) }
            }
        }
    }

    private func fallbackBanner(missing: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("No \(missing) release yet")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.textStrong)
            // One literal so the sentence stays a localization key.
            Text("These are other versions of the language. They are never grabbed automatically; Rawkoon keeps checking for \(missing).")
                .font(.caption)
                .foregroundStyle(Theme.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.inset, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.border, lineWidth: 1))
    }

    private func row(_ release: ReleaseItem, isBest: Bool = false) -> some View {
        ReleaseRow(
            release: release,
            isGrabbing: session.grabbingGuid == release.guid,
            isGrabbed: session.grabbedGuids.contains(release.guid),
            alreadyGrabbed: session.isAlreadyGrabbed(release),
            isBlocking: session.blockingGuid == release.guid,
            isBlocked: session.blockedGuids.contains(release.guid),
            isAiPick: release.guid == session.aiPickBadgeKey,
            onGrab: {
                await session.grab(
                    release, model: model, onGrabbed: onGrabbed, replace: session.activeDownload != nil
                )
            },
            onBlock: { await session.block(release, model: model) },
            languageTag: ReleaseSheetLogic.languageTag(
                title: release.title, languages: release.languages,
                isFallback: release.languageFallback == true, fallbackTag: release.languageFallbackTag
            ),
            isBest: isBest,
            bestReasons: isBest ? bestReasons(release) : nil,
            replaceMode: session.activeDownload != nil,
            isConfirmingReplace: session.replaceConfirmGuid == release.guid,
            onAskReplace: { session.replaceConfirmGuid = release.guid },
            onCancelReplace: { session.replaceConfirmGuid = nil }
        )
        .rawkoonEntrance(id: release.guid)
    }

    /// Plain-words reasons a release won, strongest first (mirrors the web best-match card).
    private func bestReasons(_ release: ReleaseItem) -> String {
        var reasons: [String] = []
        if let parsed = release.parsedQuality {
            let quality = [parsed.resolution.map { "\($0)p" }, parsed.source].compactMap(\.self).joined(separator: " ")
            if !quality.isEmpty {
                reasons.append(quality)
            }
        }
        let components = release.scoreBreakdown?.components ?? []
        let matchedLanguage = components.contains { $0.code == "language_match" && $0.value > 0 }
        if matchedLanguage {
            reasons.append(String(localized: "preferred language"))
        }
        if components.contains(where: { $0.code == "tracker_priority" && $0.value > 0 }) {
            reasons.append(String(localized: "preferred tracker"))
        }
        if let seeders = release.seeders, seeders > 0 {
            reasons.append(String(localized: "\(seeders) seeders"))
        }
        return reasons.prefix(4).joined(separator: " · ")
    }
}
