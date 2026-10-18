import RawkoonKit
import SwiftUI

/// A filterable, paginated TMDB discover grid — Browse on the Find tab, the
/// counterpart to the swipe deck. Find owns the search field and the filter state.
struct ExploreView: View {
    @Environment(AppModel.self) var model
    @Environment(\.horizontalSizeClass) private var hSizeClass

    @Binding var filters: ExploreFilters
    /// False while Find shows Swipe or search results with this view kept mounted underneath,
    /// so its toolbar button doesn't leak into the other screens.
    var isActive = true
    @State var items: [TmdbSearchItem] = []
    @State var page = 1
    @State var totalPages = 1
    @State var totalResults = 0

    @State var loading = false
    /// Until the first load settles, an empty grid means "not fetched yet", not "no results".
    @State var firstLoadSettled = false
    @State var loadingMore = false
    @State var error: String?
    @State var loadMoreError: String?
    @State var showFilters = false
    /// Bumped every time filters change so a `loadFirstPage`/`loadMore` still
    /// in flight from the previous filters discards its response instead of
    /// appending stale-filter pages onto the new grid.
    @State var loadGeneration = 0
    /// Ties each active chip to its glass shape, so adding or clearing one morphs inside the container.
    @Namespace private var chipNamespace

    /// Consecutive pages fetched for "Hide what I own" that added nothing visible.
    @State var hiddenStreak = 0

    init(filters: Binding<ExploreFilters>, isActive: Bool = true) {
        _filters = filters
        self.isActive = isActive
    }

    private var gridColumns: [GridItem] {
        if hSizeClass == .regular {
            return [GridItem(.adaptive(minimum: 150, maximum: 200), spacing: 12)]
        }
        return Array(repeating: GridItem(.flexible(), spacing: 12), count: 3)
    }

    var body: some View {
        Group {
            if hSizeClass == .regular {
                regularLayout
            } else {
                gridScroll
            }
        }
        .background(Theme.base)
        .toolbar {
            // The inline filter panel on regular width replaces the Filters sheet.
            if hSizeClass != .regular, isActive {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showFilters = true
                    } label: {
                        Label("Filters", systemImage: "line.3.horizontal.decrease.circle")
                    }
                }
            }
        }
        .sheet(isPresented: $showFilters) {
            ExploreFilterSheet(filters: $filters)
        }
        .task {
            if items.isEmpty, !loading {
                await loadFirstPage()
            }
        }
        .onChange(of: filters.hideOwned) { _, _ in
            hiddenStreak = 0
        }
        .onChange(of: filters.fetchSignature) { _, _ in
            hiddenStreak = 0
            loadGeneration += 1
            items = []
            page = 1
            totalPages = 1
            loadMoreError = nil
            // Set synchronously so no frame commits the empty state before the load starts.
            loading = true
            error = nil
            Task { await loadFirstPage() }
        }
        .onChange(of: model.isOffline) { _, offline in
            guard !offline, items.isEmpty || error != nil else { return }
            Task { await loadFirstPage() }
        }
        #if DEBUG
        .onAppear {
            // `simctl` has no tap injection, so the filter sheet — normally
            // opened by tapping the toolbar button — needs a way in for
            // screenshot verification. Mirrors the `RAWKOON_TAB`/`RAWKOON_SCREEN`
            // pattern in `RawkoonApp.swift`.
            if ProcessInfo.processInfo.environment["RAWKOON_EXPLORE_FILTERS"] != nil {
                showFilters = true
            }
        }
        #endif
    }

    /// Mac/iPad: the filter controls live inline in a left panel beside the grid.
    private var regularLayout: some View {
        HStack(spacing: 0) {
            ScrollView {
                ExploreFilterControls(filters: $filters)
                    .padding(16)
            }
            .frame(width: 300)

            Divider().overlay(Theme.border)

            gridScroll
        }
    }

    private var gridScroll: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                filterBar

                // Offline, the app-wide strip already says why nothing refreshed.
                if let error, !model.isOffline {
                    refreshErrorBanner(error)
                }

                content
            }
            .padding(.top, 12)
            .padding(.bottom, 32)
            // Chips morph on a filter change; banner, skeleton and grid swap when a load settles.
            .rawkoonMotion(RawkoonMotion.snappy, value: filters)
            .rawkoonMotion(RawkoonMotion.spring, value: loading)
        }
        .reportsTabBarScroll()
        .refreshable {
            await loadFirstPage()
        }
    }

    // MARK: Filter bar

    @ViewBuilder
    private var filterBar: some View {
        if !filters.isDefault {
            ScrollView(.horizontal, showsIndicators: false) {
                GlassEffectContainer(spacing: 8) {
                    HStack(spacing: 8) {
                        if let provider = filters.provider {
                            activeChip(Text(provider.name), id: "provider") { filters.provider = nil }
                        }
                        if let genre = filters.genre {
                            activeChip(Text(genre.name), id: "genre") { filters.genre = nil }
                        }
                        if filters.sort != .popularityDesc {
                            activeChip(Text(filters.sort.label), id: "sort") { filters.sort = .popularityDesc }
                        }
                        if filters.originalLanguageOnly {
                            activeChip(Text("Original language"), id: "language") {
                                filters.originalLanguageOnly = false
                            }
                        }
                        if filters.hideOwned {
                            activeChip(Text("Hiding what I own"), id: "owned") { filters.hideOwned = false }
                        }
                        // Stays mounted so the figure rolls; hidden while loading or failed.
                        Text("\(totalResults) results")
                            .font(.caption)
                            .foregroundStyle(Theme.muted)
                            .padding(.leading, 4)
                            .rawkoonNumeric(Double(totalResults))
                            .opacity(loading || error != nil ? 0 : 1)
                            .accessibilityHidden(loading || error != nil)
                    }
                    .padding(.horizontal, 16)
                }
            }
            .transition(.rawkoonReveal)
        }
    }

    private func activeChip(_ label: Text, id: String, onClear: @escaping () -> Void) -> some View {
        HStack(spacing: 4) {
            label
                .font(.subheadline.weight(.medium))
                .lineLimit(1)
            Button(action: onClear) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel("Clear filter")
        }
        .foregroundStyle(Theme.onAccent)
        .padding(.leading, 10)
        .frame(minHeight: 44)
        .glassEffect(.regular.tint(Theme.apricot), in: .capsule)
        .glassEffectID(id, in: chipNamespace)
    }

    private func refreshErrorBanner(_ message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
                .foregroundStyle(Theme.terracotta)
            Text(message)
                .font(.callout)
                .foregroundStyle(Theme.muted)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.raised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .padding(.horizontal, 16)
        .transition(.rawkoonReveal)
    }

    // MARK: Grid content

    @ViewBuilder
    private var content: some View {
        if items.isEmpty, loading || (!firstLoadSettled && error == nil) {
            skeletonGrid
                .transition(.rawkoonSwap)
        } else if items.isEmpty, error != nil, model.isOffline {
            ContentUnavailableView(
                "You're offline",
                systemImage: "wifi.slash",
                description: Text("This will load when you're back online.")
            )
            .rawkoonLivingSymbol(.error)
            .frame(maxWidth: .infinity)
            .padding(.top, 16)
            .transition(.rawkoonSwap)
        } else if items.isEmpty, error != nil {
            ContentUnavailableView(
                "Couldn't load Explore",
                systemImage: "wifi.slash",
                description: Text(error ?? "")
            )
            .rawkoonLivingSymbol(.error)
            .frame(maxWidth: .infinity)
            .padding(.top, 16)
            .transition(.rawkoonSwap)
        } else if items.isEmpty {
            ContentUnavailableView {
                Label("No results for these filters", systemImage: "sparkles.rectangle.stack")
            } description: {
                Text("Try a different provider, genre, or sort order.")
            } actions: {
                if !filters.isDefault {
                    Button("Clear filters") {
                        filters = ExploreFilters(kind: filters.kind)
                    }
                }
            }
            .rawkoonLivingSymbol(.empty)
            // The leading stack would otherwise hug it to its narrowest wrap.
            .frame(maxWidth: .infinity)
            .padding(.top, 28)
            .transition(.rawkoonSwap)
        } else if visibleItems.isEmpty {
            allOwnedState
                .transition(.rawkoonSwap)
        } else {
            grid
                .transition(.rawkoonSwap)
        }
    }

    /// The grid after "Hide what I own"; the library may already hold everything loaded so far.
    private var visibleItems: [TmdbSearchItem] {
        FindSearch.visible(items, hideOwned: filters.hideOwned) { $0.alreadyExists == true }
    }

    @ViewBuilder
    private var allOwnedState: some View {
        if page < totalPages, loadMoreError == nil {
            if pausedForHiddenPages {
                loadMoreButton
                    .frame(maxWidth: .infinity)
                    .padding(.top, 28)
            } else {
                ProgressView().tint(Theme.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 28)
                    .task(id: PageKey(count: items.count, hideOwned: filters.hideOwned)) {
                        await loadNextPageIfNeeded()
                    }
            }
        } else {
            ContentUnavailableView(
                "You own everything here",
                systemImage: "checkmark.circle",
                description: Text("Turn off Hide what I own to see these titles again.")
            )
            .rawkoonLivingSymbol(.empty)
            .frame(maxWidth: .infinity)
            .padding(.top, 28)
        }
    }

    private var skeletonGrid: some View {
        LazyVGrid(columns: gridColumns, spacing: 14) {
            ForEach(0 ..< 12, id: \.self) { _ in
                ShimmerView(cornerRadius: 10)
                    .aspectRatio(2.0 / 3.0, contentMode: .fit)
            }
        }
        .padding(.horizontal, 16)
    }

    private var grid: some View {
        LazyVStack(spacing: 0) {
            LazyVGrid(columns: gridColumns, spacing: 14) {
                ForEach(visibleItems) { item in
                    let zoomID = RawkoonZoom.media(tmdbId: item.tmdbId, mediaType: item.mediaType)
                    NavigationLink {
                        MediaDetailView(
                            tmdbId: item.tmdbId,
                            mediaType: item.mediaType,
                            title: item.title,
                            posterPath: item.posterUrl,
                            libraryId: item.libraryId
                        )
                        .rawkoonZoomDestination(zoomID)
                    } label: {
                        posterCard(item)
                            .rawkoonZoomSource(zoomID)
                    }
                    .buttonStyle(.rawkoonPressable)
                    .rawkoonEntrance(id: item.id)
                }
            }
            .padding(.horizontal, 16)
            // Lives with the grid: a new filter set rebuilds it and cascades; a refresh in place does not replay.
            .rawkoonEntranceScope()

            paginationFooter
            pageSentinel
        }
    }

    /// Asks for the next page while it is on screen. Its task re-runs on every new page, so a page
    /// that is all hidden by "Hide what I own" does not leave the grid stuck short of the next one.
    private var pageSentinel: some View {
        Color.clear
            .frame(height: 1)
            .task(id: PageKey(count: items.count, hideOwned: filters.hideOwned)) {
                await loadNextPageIfNeeded()
            }
    }

    private struct PageKey: Hashable {
        let count: Int
        let hideOwned: Bool
    }

    /// After this many fully hidden pages in a row, loading waits for a tap.
    private static let hiddenPageLimit = 3

    private var pausedForHiddenPages: Bool {
        filters.hideOwned && hiddenStreak >= Self.hiddenPageLimit
    }

    private func loadNextPageIfNeeded() async {
        guard page < totalPages, !loading, !pausedForHiddenPages else { return }
        let (beforePage, beforeVisible) = (page, visibleItems.count)
        await loadMore()
        guard !Task.isCancelled, filters.hideOwned, page != beforePage else { return }
        hiddenStreak = visibleItems.count == beforeVisible ? hiddenStreak + 1 : 0
    }

    @ViewBuilder
    private var loadMoreButton: some View {
        if pausedForHiddenPages, page < totalPages {
            Button("Load more") {
                hiddenStreak = 0
                Task { await loadNextPageIfNeeded() }
            }
            .buttonStyle(.bordered)
            .tint(Theme.apricot)
            .frame(minHeight: 44)
            .padding(.vertical, 12)
        }
    }

    @ViewBuilder
    private var paginationFooter: some View {
        if loadingMore {
            ProgressView().tint(Theme.muted)
                .padding(.vertical, 16)
        } else if pausedForHiddenPages {
            loadMoreButton
        } else if let loadMoreError, page < totalPages, !model.isOffline {
            Button {
                Task { await loadMore(force: true) }
            } label: {
                Text("Couldn't load more — \(loadMoreError). Tap to retry.")
                    .font(.footnote)
                    .foregroundStyle(Theme.terracotta)
                    .multilineTextAlignment(.center)
            }
            .padding(.vertical, 16)
        }
    }

    // MARK: Poster card

    /// A 2:3 poster with a status chip, plus a flexible-height caption below
    /// — unlike `DiscoverView`'s rail card, this never clips at large Dynamic
    /// Type: the caption sizes to its content instead of a fixed 34pt frame,
    /// with `minimumScaleFactor` as the last-resort guard rail.
    private func posterCard(_ item: TmdbSearchItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            CachedAsyncImage(url: model.absoluteURL(item.posterUrl), targetSize: CGSize(width: 160, height: 240)) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Theme.raised
            }
            .aspectRatio(2.0 / 3.0, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(alignment: .topTrailing) {
                if item.alreadyExists == true {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0x10231A))
                        .frame(width: 22, height: 22)
                        .background(Theme.seed, in: Circle())
                        .accessibilityLabel("In library")
                        .padding(6)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 10).strokeBorder(.white.opacity(0.06), lineWidth: 1)
            )

            Text(item.title)
                .font(.caption)
                .foregroundStyle(Theme.textStrong)
                .lineLimit(2)
                .minimumScaleFactor(0.75)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
