import RawkoonKit
import SwiftUI

/// Interactive indexer search sheet. Workflow and local filters have separate owners.
@MainActor
struct ReleaseSearchView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var session: ReleaseSearchSession
    @State private var filters: ReleaseSearchFilters
    @State private var scrolledAway = false
    let inputs: ReleaseSearchInputs
    let onGrabbed: (() -> Void)?

    init(
        query: String,
        libraryMediaId: Int?,
        tmdbId: Int?,
        mediaType: String,
        availableSeasons: [Int] = [],
        mediaYear: Int? = nil,
        originalTitle: String? = nil,
        originalLanguage: String? = nil,
        titleTranslations: [TitleTranslation] = [],
        targetSeason: Int? = nil,
        targetEpisode: Int? = nil,
        isUpgrade: Bool = false,
        onGrabbed: (() -> Void)? = nil
    ) {
        inputs = ReleaseSearchInputs(
            query: query, libraryMediaId: libraryMediaId, tmdbId: tmdbId,
            mediaType: mediaType, availableSeasons: availableSeasons,
            mediaYear: mediaYear, originalTitle: originalTitle,
            originalLanguage: originalLanguage, titleTranslations: titleTranslations,
            targetSeason: targetSeason, targetEpisode: targetEpisode, isUpgrade: isUpgrade
        )
        self.onGrabbed = onGrabbed
        _session = State(initialValue: ReleaseSearchSession(
            query: query, libraryMediaId: libraryMediaId, tmdbId: tmdbId,
            mediaType: mediaType, availableSeasons: availableSeasons,
            mediaYear: mediaYear, originalTitle: originalTitle,
            originalLanguage: originalLanguage, titleTranslations: titleTranslations,
            targetSeason: targetSeason, targetEpisode: targetEpisode, isUpgrade: isUpgrade
        ))
        _filters = State(initialValue: ReleaseSearchFilters(libraryMediaId: libraryMediaId))
    }

    var body: some View {
        VStack(spacing: 0) {
            ReleaseSheetHeader(title: "Releases", subtitle: session.searchQuery, detail: session.service)

            ReleaseSearchControls(session: session, filters: filters)
            ReleaseSearchResults(session: session, filters: filters, onGrabbed: onGrabbed, scrolledAway: $scrolledAway)
        }
        .background(Theme.base)
        .presentationDetents([.large])
        .presentationContentInteraction(.scrolls)
        .interactiveDismissDisabled(scrolledAway)
        .rawkoonMotion(RawkoonMotion.spring, value: motionState)
        .sensoryFeedback(RawkoonHaptics.feedback(for: .grab), trigger: session.grabbedGuids.count)
        .task {
            guard !model.isOffline else {
                session.isLoading = false
                return
            }
            await session.initialLoad(model: model)
        }
        .onChange(of: model.isOffline) { _, offline in
            guard !offline, session.releases.isEmpty, !session.isLoading else { return }
            Task { await session.initialLoad(model: model) }
        }
        .onChange(of: session.selectedSeason) { _, _ in
            Task { await session.search(model: model) }
        }
        .onChange(of: session.completeSeries) { _, isOn in
            if isOn {
                session.selectedSeason = nil
            }
            Task { await session.search(model: model) }
        }
        .onChange(of: inputs.signature) { _, _ in
            session.updateInputs(inputs)
        }
    }

    private enum ContentPhase: Equatable {
        case searching, offline, failed, empty, filteredOut, list
    }

    private var contentPhase: ContentPhase {
        if session.isLoading {
            return .searching
        }
        if model.isOffline, session.releases.isEmpty {
            return .offline
        }
        if session.errorMessage != nil, session.releases.isEmpty {
            return .failed
        }
        if session.releases.isEmpty {
            return .empty
        }
        return filters.filteredReleases(in: session).isEmpty ? .filteredOut : .list
    }

    private struct MotionState: Equatable {
        var content: ContentPhase
        var adminOnlyNote: String?
        var hasWarnings: Bool
        var refreshError: String?
        var grabError: String?
        var showsAiBanner: Bool
    }

    private var motionState: MotionState {
        MotionState(
            content: contentPhase,
            adminOnlyNote: session.adminOnlyNote,
            hasWarnings: !session.indexerWarnings.isEmpty,
            refreshError: session.releases.isEmpty ? nil : session.errorMessage,
            grabError: session.grabError,
            showsAiBanner: session.aiEnabled && !session.aiPickDismissed
        )
    }
}
